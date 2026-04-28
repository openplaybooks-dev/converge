#!/usr/bin/env python3
"""fill_bg_transition.py — substage 02 leaf of the new 02-background WBS.

For one transition chunk in one layer of one scene: read the prepared
side-strips+green canvas (built by decompose_scene_background.py),
ask the model to fill ONLY the green region, and save the output.

Inputs:
  assets/scenes/<id>/bg/<layer>/transitions/chunk_NN.input.png
        (left ~25% = right edge of left seed, right ~25% = left edge of
         right seed, middle ~50% = pure #00FF00 chroma-green)
  assets/scenes/<id>/bg/<layer>/plan.json   (chunk metadata)

Outputs:
  assets/scenes/<id>/bg/<layer>/transitions/chunk_NN.png       (raw)
  assets/scenes/<id>/bg/<layer>/transitions/chunk_NN.keyed.png (chroma-keyed)
  assets/scenes/<id>/bg/<layer>/transitions/chunk_NN.prompt.txt
  assets/scenes/<id>/bg/<layer>/transitions/chunk_NN.seed.txt

Cost: 1 paid image-gen call (~5¢ on Gemini).

The prompt instructs the model to:
  - paint into the pure-green region only
  - preserve the visible left + right strips as-is
  - match palette / silhouette continuity across the seam

The chroma-keyer downstream tolerates pixel-level green leakage (the
finalize stage re-runs chroma_green_to_alpha on the assembled canvas),
so the output doesn't need to be pixel-perfect green-clean.

Usage:
  python scripts/fill_bg_transition.py <scene_id> <layer_id> <chunk_index> [--seed N]
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import textwrap
from pathlib import Path

from PIL import Image

from lib import budget, stitch
from lib.image_api import active_backend, generate_image_with_edit
from lib.sprite import find_project_root


def build_fill_prompt(layer_id: str, chunk_index: int, total_chunks: int) -> str:
    layer_role = {
        "far": (
            "the FAR parallax layer (distant silhouettes, atmospheric haze, "
            "muted desaturated palette, soft edges, horizon-depth feel)"
        ),
        "mid": (
            "the MID parallax layer (middle-distance trees / structures, full "
            "saturation, readable shape, NOT foreground detail)"
        ),
        "near": (
            "the NEAR parallax layer (foreground grass / rocks / nearest detail, "
            "highest saturation, most detail)"
        ),
    }.get(layer_id, f"the {layer_id} parallax layer")
    return textwrap.dedent(f"""\
        You are given a chunk-sized canvas with three regions:

          - LEFT STRIP (~25% of width): visible painterly content from the
            previous chunk. PRESERVE THESE PIXELS — do not redraw them.
          - CENTER (~50% of width): pure chroma-green (#00FF00). FILL THIS
            REGION with painterly content that bridges the left and right
            strips.
          - RIGHT STRIP (~25% of width): visible painterly content from
            the next chunk. PRESERVE THESE PIXELS — do not redraw them.

        Your task: paint INTO the green region with content that is
        visually continuous with both side strips. The final image,
        when placed between two seed chunks, should read as one
        uninterrupted painterly band.

        Layer context: this transition is part of {layer_role}. Match
        the saturation, brush-stroke density, and silhouette scale of
        the visible side strips. Do not introduce content that doesn't
        already appear at this depth (no characters, no UI, no fine
        decoration that wouldn't match the {layer_id}-layer's feature
        density).

        Also: any pixel in your output that should be transparent in
        the final layer (e.g. sky behind a tree silhouette in mid/near
        layers) should ALSO be #00FF00. The downstream chroma-keyer
        converts those green pixels to alpha=0. So: green = 'this is
        not part of the layer's content'. Use real (non-pure-green)
        colors only for actual painterly content you want to keep.

        Critical:
          - Same dimensions as input canvas — do NOT resize.
          - Do NOT alter the left or right strips. Only paint into the
            green center.
          - This is chunk {chunk_index + 1} of {total_chunks} in the
            wide background map. Continuity across this seam is the
            whole point of this call.
    """).strip()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("layer_id")
    ap.add_argument("chunk_index", type=int)
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    layer_dir = project_root / "assets" / "scenes" / args.scene_id / "bg" / args.layer_id
    plan_path = layer_dir / "plan.json"
    if not plan_path.exists():
        raise SystemExit(f"{plan_path} missing — run decompose_scene_background.py first")
    plan = json.loads(plan_path.read_text(encoding="utf-8"))

    chunks = plan.get("chunks") or []
    chunk = next((c for c in chunks if int(c.get("index", -1)) == args.chunk_index), None)
    if chunk is None:
        raise SystemExit(
            f"chunk index {args.chunk_index} not found in plan "
            f"(have: {[c['index'] for c in chunks]})"
        )
    if chunk.get("role") != "transition":
        raise SystemExit(
            f"chunk {args.chunk_index} is role={chunk.get('role')!r}, not 'transition' — "
            f"only transition chunks need filling. Seed chunks are reused as-is in finalize."
        )

    trans_dir = layer_dir / "transitions"
    input_path = trans_dir / f"chunk_{args.chunk_index:02d}.input.png"
    if not input_path.exists():
        raise SystemExit(
            f"{input_path} missing — re-run decompose_scene_background.py to prep transition inputs"
        )

    out_raw = trans_dir / f"chunk_{args.chunk_index:02d}.png"
    out_keyed = trans_dir / f"chunk_{args.chunk_index:02d}.keyed.png"
    out_prompt = trans_dir / f"chunk_{args.chunk_index:02d}.prompt.txt"
    out_seed = trans_dir / f"chunk_{args.chunk_index:02d}.seed.txt"

    # References: ART_BIBLE.md is text — not a usable image ref. Concept.png
    # is the strongest style anchor we have.
    concept_path = project_root / "assets" / "scenes" / args.scene_id / "concept.png"
    extra_refs: list[Path] = []
    if concept_path.exists():
        extra_refs.append(concept_path)

    prompt = build_fill_prompt(args.layer_id, args.chunk_index, len(chunks))

    backend = active_backend()
    cost = budget.cost_for_image(backend)
    sys.stderr.write(
        f"[fill:{args.scene_id}/{args.layer_id}/chunk_{args.chunk_index:02d}] "
        f"backend={backend} cost={cost}¢ "
        f"input={input_path.relative_to(project_root)}\n"
    )

    chunk_w = int(chunk["width"])
    target_h = int(plan["target_height"])

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"scene-{args.scene_id}/bg-{args.layer_id}/transition-{args.chunk_index}",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            input_path,             # base = the prepared green-gap canvas
            extra_refs,             # secondary = concept (style anchor)
            seed=args.seed,
            aspect_ratio="16:9",
            resolution=(chunk_w, target_h),
        )

    out_raw.write_bytes(img_bytes)
    out_prompt.write_text(prompt, encoding="utf-8")
    out_seed.write_text(str(seed_used), encoding="utf-8")

    raw_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    if raw_img.size != (chunk_w, target_h):
        raw_img = raw_img.resize((chunk_w, target_h), Image.LANCZOS)
    keyed = stitch.chroma_green_to_alpha(raw_img)
    keyed.save(out_keyed, format="PNG")

    sys.stderr.write(
        f"  wrote {out_raw.relative_to(project_root)} + {out_keyed.name} "
        f"(seed={seed_used})\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
