#!/usr/bin/env python3
"""inpaint_seams.py — Pairwise progressive merge of segments via AI bridge inpainting.

Strategy: instead of carving N-1 voids on a wide canvas and inpainting
all at once, this script merges one pair of segments at a time:

  - Open seg-000 and seg-001. Place them side-by-side with the right
    edge of 000 and the left edge of 001 overlapping by `overlap_px`.
    Carve a chroma-green void in the middle of the overlap. Send to
    the model with the bridge prompt; model returns a merged image.
    Save as the running merged buffer.
  - Open the merged buffer and seg-002. Same thing: place them
    side-by-side with overlap, carve void, inpaint. Save the result.
  - Continue until all segments are merged. Save the final wide image.

Why pairwise: the model gets a tight window per call (two segments
worth of context, not the entire wide map), so the inpainter has less
to track. Also lets us iterate/regen one seam at a time if any single
join comes out badly.

Reads:
  - assets/scenes/{scene_id}/bg-{layer}/segments/seg-NNN.png  (every segment)
  - assets/scenes/{scene_id}/scene-plan.json                  (target dimensions)

Writes:
  - assets/scenes/{scene_id}/bg-{layer}/final.png             (final merged layer)
  - assets/scenes/{scene_id}/bg-{layer}/merge-steps/step-NN.png  (debug each step)

Usage:
  python scripts/inpaint_seams.py <scene_id> <layer>
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
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root


# Per-pair overlap (the void with feathered endpoints sits in the middle).
# Wide overlap means most of each segment's edge is dedicated to the bridge
# region — the model's creative output dominates the merge step instead of
# being a thin slice between two untouched source bookends.
DEFAULT_OVERLAP_PX = 1408
# Total void footprint inside the overlap. The OUTER ~25% on each side is a
# GRADIENT (source pixels alpha-blended into green) — these are the "fixed
# ends" the model sees as anchors. The MIDDLE 50% is pure #00FF00 (the only
# part the model is forced to invent). Source pixels on each side outside
# the void itself stay fully visible to the model as ground truth.
#
# Wide void (1280px) makes the void dominate the merged window — model has
# real creative space to paint a continuous bridge with props, ground
# texture, organic transitions — instead of cramming the bridge into a
# narrow slice between two big untouched bookends.
DEFAULT_VOID_PX = 1280


# Production-grade inpainting prompts for Gemini 2.5 Flash Image.
# Two key techniques per Google's official guidance + Nano-Banana cookbook:
#   1. Repeat preservation language ("PIXEL-IDENTICAL", "DO NOT regenerate",
#      "keep every pixel unchanged") — the model can't be FORCED to preserve
#      pixels via API flags, but explicit repetition + negatives shifts its
#      behavior toward minimal-edit mode.
#   2. The actual pixel preservation must happen post-generation in code,
#      via a feathered Gaussian mask blending only the void region. We do
#      that in `merge_pair` — these prompts just shift the model's bias.

INPAINT_PROMPT_MID = """\
You are an inpainting tool. The input image is two pieces of a wider 2D-game
mid-distance layer with a SOLID #00FF00 chroma-green VOID between them. The
void is a hard-cut rectangle of pure green; on its LEFT edge existing
mid-distance silhouettes (tree clumps, hill ridges) end crisply; on its
RIGHT edge existing silhouettes start crisply again. Repaint ONLY the
green void so the left and right pieces become one continuous mid layer.

ABSOLUTE RULE — PIXEL-IDENTICAL PRESERVATION outside the void:
The UPPER chroma-green region above the void MUST stay #00FF00 — do not
paint into it. Pixels left and right of the void must stay pixel-identical.

INSIDE THE VOID:
Green-screen contract: chroma green = transparent zone (far layer shows
through); solid painted area = mid-distance silhouettes.

  - CONTINUE the silhouette horizon from the crisp left edge to the crisp
    right edge with an organic irregular curve. No step.
  - MATCH palette, brush style, and content density of both edges.
  - KEEP #00FF00 above the silhouette top within the void.

DO NOT introduce: sky, horizon mountains (those belong to far); sharp leaves,
grass blades, foreground props (those belong to near); characters; UI; text.

Output ONE image, same dimensions as input, with the void repainted as a
continuous mid-layer bridge and every other pixel pixel-identical.
"""

INPAINT_PROMPT_NEAR = """\
You are an inpainting tool. The input image is two pieces of a wider 2D-game
foreground layer with a SOLID #00FF00 chroma-green VOID between them. The
void is a hard-cut rectangle of pure green; on its LEFT edge the existing
foreground content (grass, rocks, dirt, foliage) ends crisply in real
pixels; on its RIGHT edge the existing foreground starts crisply again in
real pixels. Repaint ONLY the green void so the left and right pieces
become one continuous foreground.

ABSOLUTE RULE — PIXEL-IDENTICAL PRESERVATION outside the void:
The UPPER chroma-green region above the void MUST stay #00FF00 untouched —
do not paint sky, mountains, mid-distance silhouettes, or anything else
above the ground line. Pixels left of the void and right of the void must
stay pixel-identical: same colors, same line weight, same brush feel.

INSIDE THE VOID:
Green-screen contract: chroma green = transparent zone (far + mid show
through later); solid painted area = foreground edge (ground texture,
rocks, foliage, foreground tree-trunk bases).

  - CONTINUE the GROUND LINE from the crisp edge on the left to the crisp
    edge on the right. The irregular silhouette boundary (grass blades,
    ferns, small branches poking up) must form a continuous organic curve.
    NO flat cut. NO step jump. If the left ground sits higher or lower
    than the right, ramp the elevation gradually across the void.
  - MATCH the palette, line weight, and brush feel of both edges — colors
    and stroke style at the left edge must blend smoothly into colors and
    stroke style at the right edge.
  - MATCH the content density of foreground props (grass tufts, rocks,
    flowers) of both edges.
  - KEEP #00FF00 above the ground line within the void (so far + mid show
    through at composition time).

DO NOT introduce: sky, horizon, mountains (those belong to far);
mid-distance tree clumps with smooth atmospheric perspective (those belong
to mid); characters; UI; text; pickup props.

Output ONE image, same dimensions as input, with the void repainted as a
continuous foreground bridge and every other pixel pixel-identical.
"""


PROMPTS = {"mid": INPAINT_PROMPT_MID, "near": INPAINT_PROMPT_NEAR}


WINDOW_PX = 1536         # total width of the temp image sent to the model
                          # (= left_anchor + void + right_anchor)


def merge_pair(
    left_img: Image.Image,
    right_img: Image.Image,
    overlap_px: int,
    void_px: int,
    prompt: str,
    project_root: Path,
    note: str,
    window_px: int = WINDOW_PX,
) -> tuple[Image.Image, int]:
    """Build a 3-part temp image (left end | green void | right end), send to
    the inpainter, and replace ONLY the void columns with the model output.

    Layout of the temp image sent to the model (width = window_px):
        [  left_end_px  ][  void_px  ][  right_end_px  ]

    The temp image is the only thing the model ever sees. Its left and right
    "end" regions are pure source pixels (left_end from the left segment, the
    right_end from the right segment) — the model treats them as anchors. The
    middle is solid #00FF00.

    After the model returns, we copy back ONLY the void columns. The
    left_end and right_end regions of the merged canvas stay byte-identical
    to the source segments — no blending, no feather drift, no risk of
    model-regeneration noise leaking into the anchor pixels.

    Returns (merged_image, void_center_x in merged coordinate space).
    """
    if left_img.size[1] != right_img.size[1]:
        raise ValueError(
            f"height mismatch: left={left_img.size[1]}, right={right_img.size[1]}"
        )
    h = left_img.size[1]
    lw, rw = left_img.size[0], right_img.size[0]
    if overlap_px > min(lw, rw):
        raise ValueError(
            f"overlap_px ({overlap_px}) > smaller segment width ({min(lw, rw)})"
        )
    if void_px > window_px:
        raise ValueError(f"void_px ({void_px}) > window_px ({window_px})")
    end_total = window_px - void_px
    if end_total <= 0:
        raise ValueError(f"no anchor margin: window_px={window_px}, void_px={void_px}")
    left_end_px = end_total // 2
    right_end_px = end_total - left_end_px

    # ── Final merged canvas ──
    # Outside the void region, the canvas is the source segments untouched.
    merged_w = lw + rw - overlap_px
    canvas = np.zeros((h, merged_w, 4), dtype=np.uint8)
    left_arr = np.array(left_img.convert("RGBA"), dtype=np.uint8)
    canvas[:, :lw, :] = left_arr

    # Cutover at the middle of the overlap region.
    cutover_x = lw - overlap_px // 2
    right_arr = np.array(right_img.convert("RGBA"), dtype=np.uint8)
    right_offset_in_self = cutover_x - (lw - overlap_px)
    right_to_take = right_arr[:, right_offset_in_self:, :]
    canvas[:, cutover_x:cutover_x + right_to_take.shape[1], :] = right_to_take
    canvas[:, :, 3] = 255  # opaque (green-screen contract)

    # Void columns in the merged canvas.
    void_lo = cutover_x - void_px // 2
    void_hi = cutover_x + (void_px - void_px // 2)

    # ── Detect ground horizon to keep upper chroma green untouched ──
    # The horizontal foreground strip lives below this y. The void only
    # gets carved from `void_top` down; rows above stay #00FF00 as the
    # source segment had them.
    def _topmost_content_row(arr_slice: np.ndarray) -> int:
        rr, gg, bb = arr_slice[:, :, 0], arr_slice[:, :, 1], arr_slice[:, :, 2]
        chroma = (rr < 60) & (gg > 180) & (bb < 60)
        content_rows = (~chroma).any(axis=1)
        nonzero = np.where(content_rows)[0]
        return int(nonzero[0]) if nonzero.size else h

    left_strip = canvas[:, max(0, void_lo - overlap_px // 2):void_lo, :3]
    right_strip = canvas[:, void_hi:min(merged_w, void_hi + overlap_px // 2), :3]
    horizon_left = _topmost_content_row(left_strip) if left_strip.shape[1] else h
    horizon_right = _topmost_content_row(right_strip) if right_strip.shape[1] else h
    horizon = min(horizon_left, horizon_right)
    void_top = max(0, horizon - 16)

    # ── Build the 3-part TEMP image ──
    # left_end: left_end_px columns immediately left of the void in the
    #           merged canvas (pure source pixels from the left segment).
    # void:     solid #00FF00 below void_top, source pixels above void_top
    #           (so the upper chroma-green region stays preserved end-to-end).
    # right_end: right_end_px columns immediately right of the void
    #            (pure source pixels from the right segment).
    src_left_lo = max(0, void_lo - left_end_px)
    src_right_hi = min(merged_w, void_hi + right_end_px)
    actual_left_end = void_lo - src_left_lo
    actual_right_end = src_right_hi - void_hi

    temp_w = actual_left_end + void_px + actual_right_end
    temp = np.zeros((h, temp_w, 4), dtype=np.uint8)

    # Left anchor (source).
    temp[:, :actual_left_end, :] = canvas[:, src_left_lo:void_lo, :]
    # Void: top = source (chroma green from upper region of merged canvas);
    # bottom = solid green carved.
    void_in_temp_lo = actual_left_end
    void_in_temp_hi = actual_left_end + void_px
    temp[:, void_in_temp_lo:void_in_temp_hi, :] = canvas[:, void_lo:void_hi, :]
    temp[void_top:, void_in_temp_lo:void_in_temp_hi, :3] = [0, 255, 0]
    temp[:, void_in_temp_lo:void_in_temp_hi, 3] = 255
    # Right anchor (source).
    temp[:, void_in_temp_hi:, :] = canvas[:, void_hi:src_right_hi, :]
    temp[:, :, 3] = 255

    temp_img = Image.fromarray(temp, mode="RGBA")

    tmp_dir = project_root / "assets" / "scenes" / "_tmp_inpaint"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp_in = tmp_dir / f"merge-{note}.temp.png"
    temp_img.save(tmp_in, format="PNG")

    backend = active_backend()
    cost = budget.cost_for_image(backend)
    sys.stderr.write(
        f"  merge {note}: {lw}+{rw} → {merged_w} "
        f"(overlap={overlap_px}, void={void_px}, "
        f"temp={temp_w}x{h} [{actual_left_end}|{void_px}|{actual_right_end}], "
        f"backend={backend} cost={cost}c)\n"
    )

    with budget.charged(
        project_root, cost, f"image-{backend}", note=f"inpaint-merge-{note}",
    ):
        img_bytes, _seed = generate_image_with_edit(
            prompt,
            tmp_in,
            [],
            aspect_ratio="3:2",
            resolution=(temp_w, h),
        )
    result = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    if result.size != (temp_w, h):
        result = result.resize((temp_w, h), Image.LANCZOS)
    result_arr = np.array(result, dtype=np.uint8)

    # ── Copy back ONLY the void columns from the model output ──
    # Left and right end regions of the canvas are NOT touched; they stay
    # byte-identical to the source segments. The model output's anchor
    # regions (which Gemini will have very subtly redrawn) are discarded.
    void_paint = result_arr[:, void_in_temp_lo:void_in_temp_hi, :]
    canvas[void_top:, void_lo:void_hi, :3] = void_paint[void_top:, :, :3]
    canvas[:, :, 3] = 255

    try:
        tmp_in.unlink()
    except Exception:
        pass

    return Image.fromarray(canvas, mode="RGBA"), cutover_x


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("layer", choices=list(PROMPTS.keys()))
    ap.add_argument("--overlap-px", type=int, default=DEFAULT_OVERLAP_PX)
    ap.add_argument("--void-px", type=int, default=DEFAULT_VOID_PX)
    args = ap.parse_args()

    if args.void_px > args.overlap_px:
        raise SystemExit(
            f"--void-px ({args.void_px}) must be <= --overlap-px ({args.overlap_px})"
        )

    project_root = find_project_root(Path.cwd())
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    layer_dir = scene_dir / f"bg-{args.layer}"
    seg_dir = layer_dir / "segments"
    if not seg_dir.is_dir():
        raise SystemExit(f"{seg_dir} not found — segments must exist before pairwise merge")

    seg_paths = sorted(
        p for p in seg_dir.glob("seg-*.png")
        if p.stem.removeprefix("seg-").isdigit()
    )
    if len(seg_paths) < 1:
        raise SystemExit(f"no seg-NNN.png files in {seg_dir}")

    layer_dir.mkdir(parents=True, exist_ok=True)
    merge_steps_dir = layer_dir / "merge-steps"
    merge_steps_dir.mkdir(parents=True, exist_ok=True)
    final_path = layer_dir / "final.png"

    if len(seg_paths) == 1:
        # Nothing to merge.
        Image.open(seg_paths[0]).convert("RGBA").save(final_path, format="PNG")
        sys.stderr.write(f"  single segment, copied to {final_path.relative_to(project_root)}\n")
        return 0

    prompt = PROMPTS[args.layer]
    sys.stderr.write(
        f"[inpaint-pairwise {args.layer} {args.scene_id}] "
        f"segments={len(seg_paths)} pairs={len(seg_paths) - 1} "
        f"overlap={args.overlap_px} void={args.void_px}\n"
    )

    # ── Linear chain with right-edge cropping ──
    # Don't grow the buffer indefinitely and pass the full thing to the model.
    # Instead: keep the running merged buffer as a numpy array, but for each
    # pair-merge, only feed the model the RIGHT TAIL of the buffer (~one
    # segment wide) plus the new right segment. After inpaint, glue the
    # inpainted tail back onto the buffer's untouched left portion. The
    # already-finalized pixels far from the seam never get re-sent to the
    # model, so they stay pixel-identical across the whole chain.
    first = np.array(Image.open(seg_paths[0]).convert("RGBA"), dtype=np.uint8)
    h = first.shape[0]
    buffer = first  # full running merged canvas
    sys.stderr.write(f"  start: seg-000 = ({buffer.shape[1]}, {h})\n")

    # Tail width: must be wide enough that the inpaint window centered on the
    # cutover fits entirely inside the tail. We need at least overlap/2 + WINDOW_PX/2
    # of tail to the LEFT of the cutover. Add some margin so the model sees
    # ~one segment of context.
    tail_px = max(args.overlap_px + WINDOW_PX, first.shape[1])

    for i in range(1, len(seg_paths)):
        right = Image.open(seg_paths[i]).convert("RGBA")
        right_arr = np.array(right, dtype=np.uint8)
        if right_arr.shape[0] != h:
            raise SystemExit(f"seg-{i:03d} height mismatch: {right_arr.shape[0]} vs {h}")

        bw = buffer.shape[1]
        if bw <= tail_px:
            # Buffer is still small enough — pass it whole.
            saved_left = np.zeros((h, 0, 4), dtype=np.uint8)
            tail = buffer
        else:
            # Slice off the right `tail_px` columns; keep the left portion aside.
            saved_left = buffer[:, : bw - tail_px, :].copy()
            tail = buffer[:, bw - tail_px:, :].copy()

        tail_img = Image.fromarray(tail, mode="RGBA")
        merged_pair, _cx = merge_pair(
            tail_img,
            right,
            args.overlap_px,
            args.void_px,
            prompt,
            project_root,
            f"{args.layer}-{i:02d}",
        )
        merged_pair_arr = np.array(merged_pair.convert("RGBA"), dtype=np.uint8)

        # Stitch: untouched-left + inpainted-(tail+right).
        buffer = np.concatenate([saved_left, merged_pair_arr], axis=1)
        sys.stderr.write(
            f"  step-{i:02d}: saved_left={saved_left.shape[1]}px "
            f"+ inpainted={merged_pair_arr.shape[1]}px → buffer={buffer.shape[1]}px\n"
        )

        # Save debug snapshot after each merge (full buffer for visual review).
        debug_path = merge_steps_dir / f"step-{i:02d}.png"
        Image.fromarray(buffer, mode="RGBA").save(debug_path, format="PNG")

    Image.fromarray(buffer, mode="RGBA").save(final_path, format="PNG")
    merged = Image.fromarray(buffer, mode="RGBA")
    sys.stderr.write(f"  wrote {final_path.relative_to(project_root)} ({merged.size[0]}x{merged.size[1]})\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
