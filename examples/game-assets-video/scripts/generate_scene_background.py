#!/usr/bin/env python3
"""generate_scene_background.py — Wide stitched parallax background per scene.

For each parallax layer in the scene's `background.layers` list:
  1. Compute segment count from target width + segment width + overlap.
  2. Generate segment 1 with concept.png + ART_BIBLE as references.
  3. Generate segments 2..N each using the previous segment's right slice
     as a reference (continuation), plus concept.png + ART_BIBLE.
  4. Composite segments into a wide canvas with feather-blended overlap.
  5. (Optional) Close the horizontal loop so the background tiles seamlessly.

Outputs per layer:
  assets/scenes/{scene_id}/bg-{layer}.png         — wide composite
  assets/scenes/{scene_id}/bg-{layer}.atlas.json  — single-frame atlas (so master atlas picks it up)
  assets/scenes/{scene_id}/bg-{layer}.prompt.txt  — segment 1 prompt
  assets/scenes/{scene_id}/bg-{layer}/segments/   — per-segment intermediates (debug)

Usage:
  python scripts/generate_scene_background.py <scene_id> <layer> [--seed N]

Configuration knobs (env vars):
  - SCENE_BG_SEGMENT_WIDTH   default 1024
  - SCENE_BG_OVERLAP         default 256
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import textwrap
from pathlib import Path

from PIL import Image

from lib import budget, stitch
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root


DEFAULT_SEGMENT_WIDTH = int(os.environ.get("SCENE_BG_SEGMENT_WIDTH", "1024"))
DEFAULT_OVERLAP = int(os.environ.get("SCENE_BG_OVERLAP", "256"))


def load_scene(project_root: Path, scene_id: str) -> dict:
    scenes_path = project_root / "assets" / "scenes.json"
    scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
    for s in scenes:
        if s.get("id") == scene_id:
            return s
    raise SystemExit(f"scene '{scene_id}' not found")


def build_segment_prompt(
    scene: dict,
    layer: str,
    segment_index: int,
    total_segments: int,
    art_bible: str,
    is_continuation: bool,
    transparent: bool = False,
    transition_below: str | None = None,
) -> str:
    biome = scene.get("biome", "")
    name = scene.get("name", scene.get("id", ""))
    layer_descriptions = {
        "far": "Far layer: distant silhouettes, muted desaturated palette, atmospheric haze. No foreground detail. Soft edges. Reads as 'background depth'.",
        "mid": "Mid layer: middle-distance trees / structures, full saturation. Some readable shape but no fine detail.",
        "near": "Near layer: foreground hints — tall grass, ground, rocks. Closest to camera. Most detail.",
    }
    layer_note = layer_descriptions.get(layer, f"Parallax layer: {layer}.")

    if is_continuation:
        intent = textwrap.dedent(f"""\
            CONTINUE the supplied reference image's right edge to the right.
            The reference is the previous segment of this background — its
            right edge becomes this segment's left edge. Match palette,
            depth, and feature density EXACTLY where the seam is. Don't
            shift parallax depth between segments.

            This is segment {segment_index + 1} of {total_segments} for the {layer} layer.
            Forward motion only — extend rightward; don't redraw what's
            already on the left.
        """)
    else:
        intent = textwrap.dedent(f"""\
            Render the FIRST segment of a wide horizontally-scrolling
            parallax background. This is segment 1 of {total_segments}
            for the {layer} layer. Its right edge will become the seed
            for segment 2's continuation.

            Use the supplied reference (the scene's concept image) to anchor
            palette, lighting direction, and parallax depth.
        """)

    transparency_block = ""
    if transparent:
        transparency_block = textwrap.dedent("""\

            CRITICAL — chroma-green sky / negative space:
            Image-gen models cannot output a true alpha channel, so render
            every pixel that is NOT part of this layer's content as PURE
            CHROMA-GREEN (#00FF00, RGB 0/255/0). The chroma-keying pipeline
            converts those green pixels to alpha=0 after rendering, which
            lets the layer below show through.

              - For the MID layer: sky behind the trees / shapes is #00FF00.
                Below the tree line, blend smoothly into the existing
                content so it sits over the FAR layer naturally.
              - For the NEAR layer: everything above the foreground silhouette
                is #00FF00; below it is the foreground content.

            Do NOT use pure green anywhere in the actual layer content —
            natural foliage greens must be muted away from #00FF00 (e.g.
            #5A8C3E, #4D7E32, never (0,255,0)). Avoid pure green ink/spill
            on outlines. The chroma keyer is tolerant but pure green inside
            content will be erased.
        """)

    # NOTE: scale is NOT enforced via prompt — telling the model "render
    # at N tiles" is unreliable (it can't measure its own output). After
    # stitching + chroma-keying, a programmatic post-process resizes the
    # final canvas so the dominant subject's actual pixel height matches
    # the layer's declared subject_height_tiles. See lib/scale.py and the
    # call site at the end of main().

    transition_block = ""
    if transition_below:
        transition_block = textwrap.dedent(f"""\

            INTER-LAYER TRANSITION:
            A second reference image was supplied: it is the BOTTOM STRIP
            of the {transition_below} layer that sits directly behind this
            one. Use it to:

              1. Match the bottom-of-{transition_below}'s exact palette and
                 silhouette band where this layer's content meets it. The
                 visible {transition_below}-edge should look like it
                 continues naturally into this layer's shapes.
              2. Soften the boundary — the lower portion of this layer's
                 content can include a few feature wisps (mist, leaf canopy,
                 grass tops) that fade into the {transition_below} layer
                 to make the parallax depth gradient invisible at the seam.

            Do NOT redraw the {transition_below} layer here. Just match its
            edge and let your content emerge above it.
        """)

    return textwrap.dedent(f"""\
        {intent.strip()}
{transparency_block}{transition_block}
        SCENE: {name}
        BIOME: {biome}
        LAYER: {layer} — {layer_note}

        ART BIBLE (mandatory):

        {art_bible.strip()[:1500]}

        Composition rules:
        - 16:9 aspect, no character, no UI, no text.
        - Pure environment. No props the player would interact with.
        - Edges must be paint-loose (no hard frame). The left and right
          edges of this segment will be blended with neighboring segments,
          so don't draw vignettes, frames, or borders.
        - Match the parallax depth signature of the reference (this layer's
          color saturation, atmospheric haze, and feature density).
        - Top and bottom of the image should not have hard horizons that
          would tile poorly when stacked under different scenes.

        No off-bible colors. No motion blur. No lens flare.
    """).strip()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("layer")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--segment-width", type=int, default=DEFAULT_SEGMENT_WIDTH)
    ap.add_argument("--overlap", type=int, default=DEFAULT_OVERLAP)
    ap.add_argument(
        "--extracted-layer-path", default=None,
        help=(
            "When set, the given PNG (typically assets/scenes/<id>/extracted/bg-<layer>.png) "
            "is dropped onto the canvas at x=0 as segment 1, skipping segment-1's "
            "image-gen call entirely. Subsequent segments use the extracted "
            "PNG's right slice as the continuation seed, so the stitched output's "
            "leftmost screen-width is pixel-identical to the concept extraction."
        ),
    )
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene = load_scene(project_root, args.scene_id)

    bg_cfg = scene.get("background", {})

    # Layer config supports two shapes:
    #   1. legacy: ["far", "mid", "near"]                  (no transparency, no chaining)
    #   2. structured: [{"id":"mid","transparent":true,"transition_below":"far"}, ...]
    raw_layers = bg_cfg.get("layers") or []
    layer_cfgs = []
    for entry in raw_layers:
        if isinstance(entry, str):
            layer_cfgs.append({
                "id": entry, "transparent": False, "transition_below": None,
                "subject_height_tiles": None,
            })
        elif isinstance(entry, dict) and "id" in entry:
            layer_cfgs.append({
                "id": entry["id"],
                "transparent": bool(entry.get("transparent", False)),
                "transition_below": entry.get("transition_below"),
                "subject_height_tiles": entry.get("subject_height_tiles"),
            })
        else:
            raise SystemExit(f"unrecognized layer entry: {entry!r}")
    layer_ids = [c["id"] for c in layer_cfgs]
    if args.layer not in layer_ids:
        raise SystemExit(
            f"layer '{args.layer}' not declared in scene '{args.scene_id}' "
            f"(layers: {layer_ids})"
        )
    this_cfg = next(c for c in layer_cfgs if c["id"] == args.layer)

    # Field-name aliases are accepted because earlier versions of the
    # schema used `width_px`/`height_px`; the current scenes.json schema
    # uses `target_width`/`target_height`. Without this fallback the
    # script silently used the default 1920×1080 and produced one-screen
    # stamps instead of a wide stitched map.
    target_w = int(bg_cfg.get("target_width") or bg_cfg.get("width_px") or 1920)
    target_h = int(bg_cfg.get("target_height") or bg_cfg.get("height_px") or 1080)
    tile_seamless = bool(bg_cfg.get("tile_seamless", bg_cfg.get("loop_horizontal", False)))
    transition_strip_h = int(bg_cfg.get("transition_strip_h", 96))
    # How many in-game tiles tall the bg canvas represents. A typical
    # platformer screen is 12 tiles high (1080/12 = 90px per tile in our
    # 1080-tall canvas). Used by the post-process scale lock to convert
    # subject_height_tiles into a target pixel height that matches the
    # canvas resolution.
    canvas_tiles_tall = float(bg_cfg.get("canvas_tiles_tall", 12.0))
    effective_tile_px = max(1, int(round(target_h / canvas_tiles_tall)))

    seg_w = int(args.segment_width)
    overlap = int(args.overlap)
    if seg_w <= overlap:
        raise SystemExit(f"segment_width ({seg_w}) must exceed overlap ({overlap})")
    # total_segments such that 1 full + (n-1) (seg_w - overlap) >= target_w
    if target_w <= seg_w:
        n_segments = 1
    else:
        n_segments = 1 + (target_w - seg_w + (seg_w - overlap) - 1) // (seg_w - overlap)
    sys.stderr.write(
        f"[scene-bg:{args.scene_id}/{args.layer}] target {target_w}×{target_h}, "
        f"{n_segments} segment(s) of {seg_w} with {overlap}px overlap\n"
    )

    # References
    bible_path = project_root / "assets" / "ART_BIBLE.md"
    concept_path = project_root / "assets" / "scenes" / args.scene_id / "concept.png"
    if not bible_path.exists():
        raise SystemExit("ART_BIBLE.md missing (run 01-art-bible)")
    if not concept_path.exists():
        raise SystemExit(f"{concept_path} missing (run scene-concept first)")
    art_bible = bible_path.read_text(encoding="utf-8")

    # Inter-layer transition reference: the bottom strip of the layer below.
    # Used as a secondary image-gen reference so this layer's content can
    # match the seam between parallax layers.
    transition_strip_path: Path | None = None
    transition_below = this_cfg["transition_below"]
    if transition_below:
        below_png = project_root / "assets" / "scenes" / args.scene_id / f"bg-{transition_below}.png"
        if not below_png.exists():
            raise SystemExit(
                f"transition_below='{transition_below}' but {below_png} doesn't exist — "
                f"generate that layer first."
            )
        transition_strip_path = (
            project_root / "assets" / "scenes" / args.scene_id
            / f"bg-{args.layer}" / "transition_below.png"
        )
        stitch.extract_bottom_strip(below_png, transition_strip_h, transition_strip_path)
        sys.stderr.write(
            f"  transition strip ({transition_strip_h}px from bottom of bg-{transition_below}) "
            f"→ {transition_strip_path.relative_to(project_root)}\n"
        )

    # Output layout
    out_dir = project_root / "assets" / "scenes" / args.scene_id
    out_dir.mkdir(parents=True, exist_ok=True)
    final_png = out_dir / f"bg-{args.layer}.png"
    final_atlas = out_dir / f"bg-{args.layer}.atlas.json"
    final_prompt = out_dir / f"bg-{args.layer}.prompt.txt"
    seg_dir = out_dir / f"bg-{args.layer}" / "segments"
    seg_dir.mkdir(parents=True, exist_ok=True)

    backend = active_backend()
    cost_per_call = budget.cost_for_image(backend)

    # If --extracted-layer-path is given, segment 1 is the extracted concept
    # crop dropped onto the canvas as-is (no image-gen, no budget charge).
    # Subsequent segments still go through the normal stitch loop, using the
    # extracted segment's right slice as the seed for segment 2.
    extracted_layer_path: Path | None = None
    if args.extracted_layer_path:
        candidate = Path(args.extracted_layer_path)
        if not candidate.is_absolute():
            candidate = project_root / candidate
        if candidate.exists():
            extracted_layer_path = candidate
            sys.stderr.write(
                f"  using extracted layer crop as segment 1: "
                f"{candidate.relative_to(project_root) if candidate.is_relative_to(project_root) else candidate}\n"
            )
        else:
            sys.stderr.write(
                f"  ⚠ --extracted-layer-path={candidate} not found — "
                f"falling back to image-gen for segment 1\n"
            )

    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    last_seed = None
    for i in range(n_segments):
        is_continuation = i > 0
        prompt = build_segment_prompt(
            scene, args.layer, i, n_segments, art_bible, is_continuation,
            transparent=this_cfg["transparent"],
            transition_below=transition_below,
        )
        if i == 0:
            final_prompt.write_text(prompt, encoding="utf-8")

        seg_path = seg_dir / f"segment_{i:02d}.png"
        seg_img: Image.Image | None = None

        # Path A — segment 1 from the extracted concept crop. No image-gen.
        if i == 0 and extracted_layer_path is not None:
            sys.stderr.write(
                f"  segment 1/{n_segments} [skip seg-1: extracted seed] "
                f"using {extracted_layer_path.name} (no image-gen, $0)\n"
            )
            extracted_img = Image.open(extracted_layer_path).convert("RGBA")
            if extracted_img.size != (seg_w, target_h):
                extracted_img = extracted_img.resize((seg_w, target_h), Image.LANCZOS)
            # Save as segment_00.png so segment 2's right-slice extraction
            # picks it up via the normal seg_dir path.
            extracted_img.save(seg_path, format="PNG")
            seg_img = extracted_img
        else:
            # Path B — normal image-gen segment.
            ref_image = concept_path
            extra_refs: list[Path] = []
            # For segments 2..N, use the previous segment's right slice as the
            # primary reference so Gemini sees the seam edge.
            if is_continuation:
                slice_path = seg_dir / f"slice_for_{i:02d}.png"
                stitch.extract_right_slice(seg_dir / f"segment_{i-1:02d}.png", overlap, slice_path)
                ref_image = slice_path
                # Concept becomes secondary so style stays anchored across segments.
                extra_refs.append(concept_path)
            # Inter-layer transition strip is always a secondary reference when
            # available — the model needs to match the layer below at every
            # segment, not just segment 1.
            if transition_strip_path is not None:
                extra_refs.append(transition_strip_path)
            # When extending from an extracted seed, also attach the
            # extracted layer crop so segments 2..N inherit its style/density.
            if extracted_layer_path is not None and is_continuation:
                extra_refs.append(extracted_layer_path)

            sys.stderr.write(
                f"  segment {i + 1}/{n_segments} (continuation={is_continuation}, "
                f"transparent={this_cfg['transparent']}, transition_below={transition_below}) "
                f"backend={backend} cost={cost_per_call}¢\n"
            )
            with budget.charged(
                project_root, cost_per_call, f"image-{backend}",
                note=f"scene-{args.scene_id}/bg-{args.layer}/seg{i}",
            ):
                img_bytes, seed_used = generate_image_with_edit(
                    prompt,
                    ref_image,
                    extra_refs,
                    seed=args.seed if i == 0 else None,
                    aspect_ratio="16:9",
                    resolution=(seg_w, target_h),
                )
            last_seed = seed_used
            seg_path.write_bytes(img_bytes)
            seg_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")

        # Paste into canvas with overlap blending (common to both paths).
        if seg_img.size != (seg_w, target_h):
            seg_img = seg_img.resize((seg_w, target_h), Image.LANCZOS)
        paste_x = i * (seg_w - overlap)
        # Final segment may extend past target_w; clamp by taking only what fits
        if paste_x + seg_w > target_w:
            crop_w = target_w - paste_x
            seg_img = seg_img.crop((0, 0, crop_w, target_h))
        stitch.paste_with_feather(canvas, seg_img, paste_x, overlap if i > 0 else 0)

    if tile_seamless and n_segments > 1:
        canvas = stitch.close_horizontal_loop(canvas, overlap)
        sys.stderr.write(f"  closed horizontal loop with {overlap}px blend\n")

    # Chroma-green → alpha for transparent layers. Done AFTER stitching so
    # the feather-blend on overlaps doesn't smear pure-green pixels into
    # non-key colors. The model's #00FF00 sky pixels become alpha=0; the
    # composited canvas stays opaque elsewhere.
    if this_cfg["transparent"]:
        canvas = stitch.chroma_green_to_alpha(canvas)
        sys.stderr.write(
            f"  chroma-green keyed (sky pixels → alpha=0)\n"
        )

    # Programmatic scale lock — after stitching + chroma-key, measure the
    # actual opaque-content height in pixels and rescale so it matches
    # the layer's declared subject_height_tiles. Telling the model "draw
    # this at N tiles" is unreliable; deterministic post-process is.
    # Only meaningful for transparent layers where the bbox = the subject;
    # for opaque layers the bbox is the whole canvas and the scale_factor
    # comes out near 1.0 (no-op).
    sht = this_cfg.get("subject_height_tiles")
    if sht is not None:
        from lib.scale import lock_subject_height
        canvas, scale_info = lock_subject_height(
            canvas,
            target_height_tiles=float(sht),
            tile_px=effective_tile_px,
            baseline="bottom",
        )
        sys.stderr.write(
            f"  scale lock ({sht:.1f}T × {effective_tile_px}px/tile = "
            f"{scale_info['target_height_px']}px target): opaque content was "
            f"{scale_info['original_height_px']}px, scale ×{scale_info['scale_factor']:.3f}"
            f"{'  CLAMPED' if scale_info['was_clamped'] else ''}\n"
        )

    canvas.save(final_png, format="PNG")

    # Single-frame atlas so the master-atlas builder picks it up
    atlas = {
        "image": final_png.name,
        "meta": {
            "scene_id": args.scene_id,
            "bg_layer": args.layer,
            "rows": 1,
            "cols": 1,
            "frame_count": 1,
            "frame_size": {"w": target_w, "h": target_h},
            "sheet_size": {"w": target_w, "h": target_h},
            "frame_order": "single",
            "n_segments": n_segments,
            "segment_width": seg_w,
            "overlap_px": overlap,
            "tile_seamless": tile_seamless,
            "transparent": this_cfg["transparent"],
            "transition_below": transition_below,
            "seed": last_seed,
        },
        "frames": [{
            "filename": final_png.name,
            "frame": {"x": 0, "y": 0, "w": target_w, "h": target_h},
        }],
    }
    final_atlas.write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    sys.stderr.write(
        f"  wrote {final_png.relative_to(project_root)} "
        f"({target_w}×{target_h}, {n_segments} segments)\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
