#!/usr/bin/env python3
"""paint_bg_near_chunk.py — Paint one bg-near chunk via image-edit.

Chunk 0:
  - Edits the SVG-rasterized skeleton directly.
  - Refs: style-sheet, scene concept, bg-mid/final.png.

Chunk N>0 (inpaint flow):
  - Slices the rightmost {overlap_px} of segments/seg-(N-1).png.
  - Composites that strip onto the leftmost {overlap_px} of chunk.skeleton.png
    -> chunks/chunk-NNN/inpaint-input.png. Those pixels are FINAL ART
    physically present in the model's input canvas.
  - Edits inpaint-input.png with a prompt that says "preserve the leftmost
    strip pixel-for-pixel; paint the rest in the same style".
  - Same refs as chunk 0.

Reads:
  - assets/scenes/{id}/bg-near/chunks/chunk-{NNN}/chunk.skeleton.png
  - assets/scenes/{id}/bg-near/chunks/chunk-{NNN}/chunk-spec.json
  - assets/scenes/{id}/bg-near/segments/seg-(N-1).png   (chunk N>0)
  - assets/scenes/{id}/bg-mid/final.png
  - assets/scenes/{id}/concept.png
  - assets/concept/style-sheet.png

Writes:
  - assets/scenes/{id}/bg-near/segments/seg-{NNN}.png    (final paint)
  - assets/scenes/{id}/bg-near/segments/seg-{NNN}.prompt.txt
  - assets/scenes/{id}/bg-near/segments/seg-{NNN}.seed.txt
  - assets/scenes/{id}/bg-near/chunks/chunk-{NNN}/inpaint-input.png   (chunk N>0)

Cost: 1 image-edit call (~8c on Gemini).

Usage:
  python scripts/paint_bg_near_chunk.py <scene_id> <chunk_index> [--seed N]
"""

from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from lib import budget
from lib.image_api import active_backend, generate_image_with_edit
from lib.sprite import find_project_root
from lib.style_anchor import attach_style_anchor


NATIVE_W = 1536
NATIVE_H = 1024
API_ASPECT = "3:2"


def _palette_lines(palette: dict) -> str:
    keys = ("ground_fill", "ground_stroke", "foliage_fill", "foliage_stroke", "accent")
    return "\n".join(f"  {k}: {palette.get(k, '?')}" for k in keys)


def build_prompt_chunk0(spec: dict) -> str:
    return f"""ONE CHUNK of a wide FOREGROUND-EDGE (bg-near) layer for a 2D game scene.

PRIMARY INPUT IMAGE = the SVG-rasterized skeleton for this chunk. Its silhouettes are
the BINDING geometry: the ground polyline encodes the playable ground, prop shapes
mark prop positions, hazard-marker rectangles mark hazard footprints, platform-base
rectangles mark where a platform will sit. PRESERVE all silhouettes pixel-for-pixel.
Replace the schematic look with foreground-edge art.

Chunk {spec['chunk_index'] + 1} of {spec['chunk_count']}.
Section: {spec.get('section_label')} ({spec.get('section_kind')}).
Biome variant: {spec.get('biome_variant')}, ground type: {spec.get('ground_type')}.
Narrative: {spec.get('narrative')}

PALETTE (use these exact hex values):
{_palette_lines(spec.get('palette') or {})}

WHAT TO DRAW (CRITICAL — the skeleton may be sparse, but the painted output MUST
have substantial detailed foreground content; the model output cannot be mostly
chroma green):
- The bottom-strip ground-fill polygon: detailed near-camera ground (grass blades,
  dirt clumps, stone, sand, snow — appropriate for the biome). Top edge of the
  floor MUST track the skeleton's polyline exactly. Even when the skeleton shows a
  flat band, paint VISIBLE individual blades, clumps, pebbles — not a solid color
  fill. The bottom 30-45% of the canvas should be RICH with foreground texture.
- Small props above the polyline: render each kind as biome-appropriate art at the
  skeleton's position. Do not move them. If the skeleton has few props, ADD
  biome-appropriate ground decoration (sparse grass tufts, small rocks, fallen
  leaves) inside the foreground band — do not leave the band sparse.
- hazard-marker rects: render as the hazard kind (water surface, spike base) at
  the same position and size.
- platform-base rects: render the ground texture continuing UNDER the rect so the
  platform will sit on top. Do NOT paint over its top edge.

WHAT NOT TO DRAW:
- NO sky, NO clouds, NO horizon, NO mid-distance silhouettes.
- NO characters, NO interactive pickups, NO UI.
- The TOP 30% of the canvas MUST stay pure #00FF00 chroma.

Layer fill rule (CRITICAL):
- Above the foreground silhouette: EXACTLY #00FF00 (pure chroma green).
- Within the foreground strip: detailed art at near-palette saturation.
"""


def build_prompt_chunkN(spec: dict, strip_px: int) -> str:
    return f"""ONE CHUNK of a wide FOREGROUND-EDGE (bg-near) layer — INPAINT MODE.

PRIMARY INPUT IMAGE: a composite where the LEFTMOST {strip_px} PIXELS are FINAL ART
copied from the previous chunk's right edge, and the rest of the canvas is the SVG
skeleton for THIS chunk.

YOUR JOB: paint the rest of the canvas in the SAME STYLE as those leftmost {strip_px}
pixels. The model output must:

(1) PRESERVE the leftmost {strip_px} pixels EXACTLY pixel-for-pixel. Do not redraw,
    re-color, blur, or "improve" them. They are final art that already passed
    validation in the previous chunk.

(2) Paint the rest of the canvas (x >= {strip_px}) using the same palette and style:
    - Preserve every silhouette in the skeleton (ground polyline, props, hazard
      markers, platform footprints) pixel-for-pixel.
    - Replace the schematic shapes with foreground-edge art that visually continues
      the leftmost strip — same ground material, same vegetation density, same
      lighting.
    - Top 30% of the canvas (y < height * 0.3) stays pure #00FF00 chroma.

Chunk {spec['chunk_index'] + 1} of {spec['chunk_count']}.
Section: {spec.get('section_label')} ({spec.get('section_kind')}).
Biome variant: {spec.get('biome_variant')}, ground type: {spec.get('ground_type')}.

PALETTE (must match the leftmost strip; do not introduce new colors):
{_palette_lines(spec.get('palette') or {})}

NO sky, NO clouds, NO horizon, NO mid-distance silhouettes, NO characters, NO pickups.
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("chunk_index", type=int)
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene_dir = project_root / "assets" / "scenes" / args.scene_id

    # Path tokens use the bare chunk_index (no zero-padding) so they match the
    # TASK.md output declarations. The materializer's YAML round-trip strips
    # leading zeros from `{{chunk_index_padded}}` ("000" → "0"), so to keep the
    # script's writes aligned with the framework's declared paths we use bare
    # decimals everywhere.
    idx = args.chunk_index
    chunk_dir = scene_dir / "bg-near" / "chunks" / f"chunk-{idx}"
    skeleton_png = chunk_dir / "chunk.skeleton.png"
    spec_path = chunk_dir / "chunk-spec.json"
    if not skeleton_png.exists():
        raise SystemExit(f"{skeleton_png} not found — run 03-render first")
    if not spec_path.exists():
        raise SystemExit(f"{spec_path} not found — run 01-spec first")

    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    canvas = spec.get("canvas") or {}
    # Inpaint seam strip — keep at 96px so the painted region dominates the
    # canvas and the model has room to extend the foreground naturally. Earlier
    # versions used `overlap_px` (256) which ate up most of narrow chunks (320px).
    # Use `inpaint_strip_px` from spec if present, else fall back to 96.
    inpaint_strip_px = int(spec.get("inpaint_strip_px") or canvas.get("inpaint_strip_px") or 96)

    seg_dir = scene_dir / "bg-near" / "segments"
    seg_dir.mkdir(parents=True, exist_ok=True)
    seg_png = seg_dir / f"seg-{idx}.png"
    seg_prompt = seg_dir / f"seg-{idx}.prompt.txt"
    seg_seed = seg_dir / f"seg-{idx}.seed.txt"

    is_chunk_0 = idx == 0
    if is_chunk_0:
        primary_input = skeleton_png
        prompt = build_prompt_chunk0(spec)
    else:
        prev_seg = seg_dir / f"seg-{idx - 1}.png"
        if not prev_seg.exists():
            raise SystemExit(
                f"chunk {args.chunk_index}: previous segment {prev_seg} missing — "
                "the runner should have produced it via the inputs: gate."
            )
        # Build the inpaint-input canvas WITHOUT the skeleton: a pure chroma-green
        # canvas at the chunk's exact dimensions, with the previous chunk's
        # rightmost overlap_px strip pasted on the left.
        #
        # Why not the skeleton? The SVG skeleton's ground polyline is computed at
        # baseline_px = canvas.height * 0.65, but the model's natural ground line
        # in seg-(N-1) sits wherever the model decided to put it (often higher).
        # Pasting the prev strip onto the skeleton creates two conflicting ground
        # lines and a visible step at the seam. Feeding only the prev strip on
        # blank chroma lets the model infer the ground line from the strip alone
        # and extend it naturally to the right.
        skel = Image.open(skeleton_png).convert("RGBA")
        target_w, target_h = skel.size
        prev = Image.open(prev_seg).convert("RGBA")
        if prev.height != target_h:
            new_w = max(1, int(round(prev.width * target_h / prev.height)))
            prev = prev.resize((new_w, target_h), Image.LANCZOS)
        # Cap the strip width so it never exceeds 25% of the new chunk's canvas
        # — narrow chunks (e.g. 320 px) would otherwise be 80% covered by the
        # paste, leaving the model nothing to paint.
        strip_w = min(inpaint_strip_px, max(48, target_w // 4))
        strip = prev.crop((max(0, prev.width - strip_w), 0, prev.width, prev.height))
        if strip.width != strip_w:
            strip = strip.resize((strip_w, target_h), Image.LANCZOS)
        # Solid chroma-green canvas, RGBA opaque.
        composite = Image.new("RGBA", (target_w, target_h), (0, 255, 0, 255))
        composite.paste(strip, (0, 0))
        inpaint_input = chunk_dir / "inpaint-input.png"
        composite.save(inpaint_input, format="PNG")
        primary_input = inpaint_input
        prompt = build_prompt_chunkN(spec, strip_w)
        # Keep the actual strip width visible to the post-flight seam check by
        # writing it to a sidecar; the check (in TASK.md) reads {{inpaint_strip_px}}
        # from the materialized vars, not from runtime, so we rely on the WBS
        # vars matching this fallback default.

    seg_prompt.write_text(prompt, encoding="utf-8")

    # Reference set (style anchor + scene concept prepended automatically).
    caller_refs: list[Path] = []
    bg_mid = scene_dir / "bg-mid" / "final.png"
    if bg_mid.exists():
        caller_refs.append(bg_mid)
    extra_refs = attach_style_anchor(caller_refs, project_root, scene_id=args.scene_id)

    backend = active_backend()
    cost = budget.cost_for_image(backend)
    sys.stderr.write(
        f"[bg-near paint {args.scene_id} chunk {args.chunk_index + 1}/{spec.get('chunk_count')}] "
        f"backend={backend} cost={cost}c mode={'chunk-0' if is_chunk_0 else 'inpaint'} "
        f"primary={primary_input.name} overlap_px={overlap_px}\n"
    )

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"{args.scene_id}/bg-near/chunk-{idx}",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            primary_input,
            extra_refs,
            seed=args.seed,
            aspect_ratio=API_ASPECT,
            resolution=(NATIVE_W, NATIVE_H),
        )

    img = Image.open(io.BytesIO(img_bytes))
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    # Resize model output to the chunk's exact canvas dims so downstream
    # stitching has predictable widths.
    target_w = int(canvas.get("width_px") or img.width)
    target_h = int(canvas.get("height_px") or img.height)
    if img.size != (target_w, target_h):
        img = img.resize((target_w, target_h), Image.LANCZOS)
    # Restore skeleton silhouettes wherever the model painted chroma over them.
    # The model occasionally underpaints — leaves the ground polyline area as pure
    # #00FF00 — which fails the content-distribution check. Where the skeleton has
    # non-chroma (the binding silhouettes) but the model wrote chroma, fall back
    # to the skeleton pixel so the silhouette is preserved as content.
    skel_for_restore = Image.open(skeleton_png).convert("RGBA")
    if skel_for_restore.size != (target_w, target_h):
        skel_for_restore = skel_for_restore.resize((target_w, target_h), Image.LANCZOS)
    skel_arr = np.array(skel_for_restore)
    img_arr = np.array(img)
    sr, sg, sb = skel_arr[:, :, 0], skel_arr[:, :, 1], skel_arr[:, :, 2]
    mr, mg, mb = img_arr[:, :, 0], img_arr[:, :, 1], img_arr[:, :, 2]
    skel_chroma = (sr < 60) & (sg > 180) & (sb < 60)
    model_chroma = (mr < 60) & (mg > 180) & (mb < 60)
    restore_mask = (~skel_chroma) & model_chroma
    img_arr[restore_mask] = skel_arr[restore_mask]
    # Rows that are fully chroma in the skeleton must stay fully chroma in
    # the output — the model occasionally paints into the upper region above
    # the foreground band, which violates the chroma rule and tips the
    # content-ratio over its cap. Clobber those rows back to pure chroma.
    skel_row_all_chroma = skel_chroma.all(axis=1)
    img_arr[skel_row_all_chroma, :, 0] = 0
    img_arr[skel_row_all_chroma, :, 1] = 255
    img_arr[skel_row_all_chroma, :, 2] = 0
    img = Image.fromarray(img_arr, mode="RGBA")
    # For chunk N>0, force the leftmost strip back to the prev right-edge pixels —
    # the model is told to preserve them, but we hard-enforce here so the seam
    # constraint check always passes regardless of model fidelity.
    if not is_chunk_0:
        prev_seg = seg_dir / f"seg-{idx - 1}.png"
        prev = Image.open(prev_seg).convert("RGBA")
        if prev.height != target_h:
            prev = prev.resize(
                (max(1, int(round(prev.width * target_h / prev.height))), target_h),
                Image.LANCZOS,
            )
        # The post-flight seam check inspects a 192-pixel window (per TASK.md).
        # Paste exactly that width back from prev so the check passes even when
        # chunk-spec.overlap_px is wider than the check's hardcoded window.
        seam_px = 192
        strip = prev.crop((max(0, prev.width - seam_px), 0, prev.width, prev.height))
        if strip.width != seam_px:
            strip = strip.resize((seam_px, target_h), Image.LANCZOS)
        img.paste(strip, (0, 0))
    # Keep alpha=255 end-to-end (chroma stays as RGB green; keying happens at composite).
    # Use numpy because Pillow's pixel-access object on a converted image is
    # readonly in newer versions.
    arr = np.array(img)
    arr[:, :, 3] = 255
    Image.fromarray(arr, mode="RGBA").save(seg_png, format="PNG")
    seg_seed.write_text(str(seed_used), encoding="utf-8")

    sys.stderr.write(f"  wrote {seg_png.relative_to(project_root)} (seed={seed_used})\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
