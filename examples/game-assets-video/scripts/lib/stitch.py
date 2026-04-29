"""stitch.py — Feather-blend horizontal segments into a wide composite.

Used by `generate_scene_background.py` to assemble multi-call backgrounds:
each segment is image-gen'd separately with the previous segment's right
edge as a reference, then this module joins them with overlap blending so
the seam is invisible.

Two helpers:
  - paste_with_feather() : composite segment N onto a canvas at offset X,
                           blending the leftmost `overlap_px` columns
                           against whatever's already on the canvas.
  - close_horizontal_loop() : optional final pass that wraps the right edge
                              back to the left edge for tileable backgrounds.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


def _linear_alpha_ramp(width: int) -> np.ndarray:
    """Per-column alpha 0..1 left→right; used to fade IN segment N over its
    overlap region. Linear is fine for soft-feature backgrounds; can be
    swapped for cosine if linear shows banding."""
    return np.linspace(0.0, 1.0, num=width, dtype=np.float32)


def _min_cost_seam(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    """Find a min-cost monotone vertical seam through the overlap region.

    Returns a 1-D array of length H giving the column index (in [0, W)) at
    which to switch from `left` to `right` for each row. The seam is
    8-connected: row r's column may differ from row r-1's by at most 1.
    Used by `paste_with_seam_cut` to choose where to cut between two
    overlapping images so the seam follows low-difference content (sky,
    flat ground) rather than slicing through high-detail features.
    """
    # Cost = squared RGB difference per overlap pixel. Lower = more
    # similar = better seam location.
    if left.shape != right.shape:
        raise ValueError(f"shape mismatch {left.shape} vs {right.shape}")
    h, w, _ = left.shape
    if w == 0:
        return np.zeros(h, dtype=np.int32)
    diff = (left[..., :3].astype(np.float32) - right[..., :3].astype(np.float32))
    cost = (diff * diff).sum(axis=-1)  # H × W

    # Dynamic-programming pass: for each row, the min cumulative cost to
    # reach each column from the top, allowing column changes of ±1.
    accum = np.empty_like(cost, dtype=np.float32)
    accum[0] = cost[0]
    backtrack = np.zeros_like(cost, dtype=np.int8)
    for r in range(1, h):
        # For each column c in row r: take the min of (r-1, c-1), (r-1, c), (r-1, c+1)
        prev = accum[r - 1]
        left_n = np.empty_like(prev)
        left_n[0] = np.inf
        left_n[1:] = prev[:-1]
        right_n = np.empty_like(prev)
        right_n[-1] = np.inf
        right_n[:-1] = prev[1:]
        stacked = np.stack([left_n, prev, right_n], axis=0)  # 3 × W
        choice = np.argmin(stacked, axis=0)  # 0 = up-left, 1 = up, 2 = up-right
        best = stacked[choice, np.arange(w)]
        accum[r] = cost[r] + best
        backtrack[r] = choice - 1  # -1, 0, +1

    # Trace back the min-cost seam from the bottom row.
    seam = np.empty(h, dtype=np.int32)
    seam[-1] = int(np.argmin(accum[-1]))
    for r in range(h - 2, -1, -1):
        seam[r] = max(0, min(w - 1, seam[r + 1] - int(backtrack[r + 1, seam[r + 1]])))
    return seam


def paste_with_seam_cut(
    canvas: Image.Image,
    segment: Image.Image,
    paste_x: int,
    overlap_px: int,
    *,
    feather_px: int = 4,
) -> None:
    """Paste `segment` onto `canvas` using a content-aware vertical seam.

    Better than `paste_with_feather` for OPAQUE layers (bg-far) — the
    seam follows low-cost content (sky, flat horizon) rather than blending
    every column linearly. Avoids the seam smear that linear blending
    leaves on opaque imagery.

    For each row in the overlap region, finds the column where the two
    images differ least, and uses that column as the seam. A small
    `feather_px` band around the chosen seam column linearly blends the
    two so the cut isn't a hard line.

    Falls back to `paste_with_feather` (linear blend) when the segment
    has any transparency in the overlap — seam-cut on RGBA produces
    visible holes where alpha differs.
    """
    seg_w, seg_h = segment.size
    canvas_w, canvas_h = canvas.size
    if seg_h != canvas_h:
        raise ValueError(f"segment height {seg_h} != canvas height {canvas_h}")
    if paste_x + seg_w > canvas_w:
        raise ValueError(f"paste at x={paste_x} + segment {seg_w} > canvas {canvas_w}")

    overlap_px = max(0, min(overlap_px, seg_w))

    seg_arr = np.array(segment.convert("RGBA"), dtype=np.float32)
    canvas_arr = np.array(canvas.convert("RGBA"), dtype=np.float32)

    if overlap_px <= 0:
        canvas_arr[:, paste_x:paste_x + seg_w, :] = seg_arr
        canvas_arr = np.clip(canvas_arr, 0, 255).astype(np.uint8)
        canvas.paste(Image.fromarray(canvas_arr, mode="RGBA"))
        return

    existing = canvas_arr[:, paste_x:paste_x + overlap_px, :]
    incoming = seg_arr[:, :overlap_px, :]

    # Seam-cut works best on solid RGB. If either side has substantial
    # transparency in the overlap, fall back to linear feather.
    has_transparency = (existing[..., 3] < 250).any() or (incoming[..., 3] < 250).any()
    if has_transparency:
        paste_with_feather(canvas, segment, paste_x, overlap_px)
        return

    seam_cols = _min_cost_seam(existing, incoming)
    h = canvas_h
    w = overlap_px
    feather = max(0, min(feather_px, w // 4))

    # Build a per-pixel ramp: 0 = use existing (left), 1 = use incoming (right).
    ramp = np.zeros((h, w), dtype=np.float32)
    cols = np.arange(w)[None, :]  # 1 × W
    seam_col = seam_cols[:, None]  # H × 1
    if feather <= 0:
        ramp[:] = (cols >= seam_col).astype(np.float32)
    else:
        # Linear ramp across [seam-feather, seam+feather].
        rel = (cols - seam_col).astype(np.float32) / float(feather)
        ramp = np.clip(0.5 + 0.5 * rel, 0.0, 1.0)
    ramp = ramp[..., None]  # H × W × 1

    blended = existing * (1.0 - ramp) + incoming * ramp
    canvas_arr[:, paste_x:paste_x + overlap_px, :] = blended

    if seg_w > overlap_px:
        canvas_arr[:, paste_x + overlap_px:paste_x + seg_w, :] = seg_arr[:, overlap_px:, :]

    canvas_arr = np.clip(canvas_arr, 0, 255).astype(np.uint8)
    canvas.paste(Image.fromarray(canvas_arr, mode="RGBA"))


def paste_segments_with_voids(
    segments: list[Image.Image],
    target_w: int,
    target_h: int,
    overlap_px: int,
    void_px: int,
) -> tuple[Image.Image, list[int]]:
    """Place segments side-by-side on a wide canvas with overlap, then carve
    a chroma-green void in the middle of each overlap region.

    Each adjacent pair of segments overlaps by `overlap_px`. The middle
    `void_px` of that overlap is replaced by pure #00FF00 (RGB 0,255,0)
    so the inpainting pass has a clearly-defined region to fill.

    Returns (canvas, void_centers_x). `canvas` is RGBA at (target_w, target_h).
    `void_centers_x` is the x-coordinate of each void's centerline; the
    inpainter uses these to crop windows centered on each seam.

    The segments must already be the right per-segment width (target_w
    expanded by overlap allowance: per_seg_w = (target_w + overlap*(N-1)) / N).
    """
    if not segments:
        raise ValueError("no segments")
    n = len(segments)
    if void_px > overlap_px:
        raise ValueError(f"void_px ({void_px}) must be <= overlap_px ({overlap_px})")

    # Resize segments to a common per-seg width.
    per_seg_w = (target_w + overlap_px * (n - 1)) // n
    resized: list[Image.Image] = []
    for s in segments:
        if s.size != (per_seg_w, target_h):
            s = s.resize((per_seg_w, target_h), Image.LANCZOS)
        resized.append(s.convert("RGBA"))

    # Composite onto wide canvas. Where adjacent segments overlap, take
    # the LEFT half of the overlap from segment N and the RIGHT half from
    # segment N+1. The middle `void_px` is then carved out in a separate
    # pass below — that's where the inpainter writes.
    canvas_arr = np.zeros((target_h, target_w, 4), dtype=np.uint8)
    void_centers: list[int] = []
    x = 0
    for i, im in enumerate(resized):
        seg_arr = np.array(im, dtype=np.uint8)
        if i == 0:
            # First segment: copy in full from x=0 to x=per_seg_w.
            canvas_arr[:, x:x + per_seg_w, :] = seg_arr
        else:
            # Subsequent segments overlap the previous by overlap_px.
            # Cutover line: the middle of the overlap region (where the
            # void will be carved). Left of that line stays from prev;
            # right comes from this segment.
            cutover_x = x + overlap_px // 2
            seg_to_canvas_offset = x  # canvas[seg_to_canvas_offset + j] = seg[j]
            # Right half of the overlap + the rest of the segment.
            right_start_in_seg = cutover_x - seg_to_canvas_offset
            canvas_arr[:, cutover_x:x + per_seg_w, :] = seg_arr[:, right_start_in_seg:, :]
            # Carve the void. The middle `void_px` straddles cutover_x.
            void_lo = cutover_x - void_px // 2
            void_hi = cutover_x + (void_px - void_px // 2)
            canvas_arr[:, void_lo:void_hi, :3] = [0, 255, 0]
            canvas_arr[:, void_lo:void_hi, 3] = 255
            void_centers.append(cutover_x)
        x += per_seg_w - overlap_px

    return Image.fromarray(canvas_arr, mode="RGBA"), void_centers


def paste_with_feather(
    canvas: Image.Image,
    segment: Image.Image,
    paste_x: int,
    overlap_px: int,
) -> None:
    """Paste `segment` onto `canvas` at (paste_x, 0).

    The leftmost `overlap_px` columns of `segment` blend with the existing
    canvas content using a linear alpha ramp (0 → 1 left to right). Beyond
    those columns the segment is opaque-pasted. The blend is in-place on
    `canvas`.
    """
    seg_w, seg_h = segment.size
    canvas_w, canvas_h = canvas.size
    if seg_h != canvas_h:
        raise ValueError(f"segment height {seg_h} != canvas height {canvas_h}")
    if paste_x + seg_w > canvas_w:
        raise ValueError(f"paste at x={paste_x} + segment {seg_w} > canvas {canvas_w}")

    overlap_px = max(0, min(overlap_px, seg_w))

    seg_arr = np.array(segment.convert("RGBA"), dtype=np.float32)
    canvas_arr = np.array(canvas.convert("RGBA"), dtype=np.float32)

    if overlap_px > 0:
        ramp = _linear_alpha_ramp(overlap_px)[None, :, None]  # shape (1, overlap_px, 1)
        # Blend the overlap region in place.
        existing = canvas_arr[:, paste_x:paste_x + overlap_px, :]
        incoming = seg_arr[:, :overlap_px, :]
        blended = existing * (1.0 - ramp) + incoming * ramp
        canvas_arr[:, paste_x:paste_x + overlap_px, :] = blended

    # Right of the overlap: pure paste from segment.
    if seg_w > overlap_px:
        canvas_arr[:, paste_x + overlap_px:paste_x + seg_w, :] = seg_arr[:, overlap_px:, :]

    canvas_arr = np.clip(canvas_arr, 0, 255).astype(np.uint8)
    canvas.paste(Image.fromarray(canvas_arr, mode="RGBA"))


def close_horizontal_loop(canvas: Image.Image, overlap_px: int) -> Image.Image:
    """Make the canvas horizontally tile by blending its right `overlap_px`
    columns into its left `overlap_px` columns. The output's left edge will
    match its right edge after wrap.

    Returns a new Image (does not modify `canvas` in place).
    """
    arr = np.array(canvas.convert("RGBA"), dtype=np.float32)
    h, w, _ = arr.shape
    if overlap_px <= 0 or overlap_px >= w // 2:
        return canvas.copy()

    # Take the right `overlap_px` columns; blend them into the left
    # `overlap_px` columns with a left→right ramp (right slice fades out
    # as we move left to right, left slice fades in).
    right = arr[:, w - overlap_px:, :].copy()
    left = arr[:, :overlap_px, :].copy()
    ramp = _linear_alpha_ramp(overlap_px)[None, :, None]
    blended_left = right * (1.0 - ramp) + left * ramp
    arr[:, :overlap_px, :] = blended_left

    # Optionally also blend the right side toward the new left so the seam
    # is symmetric. We leave the right side untouched; the resulting image
    # is "left-edge-fixed" — playback wrap from right→left lands on the
    # blended pixels.

    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, mode="RGBA")


def extract_right_slice(image_path: Path, slice_px: int, out_path: Path) -> None:
    """Save the right-most `slice_px` columns of an image to `out_path`.
    Used as a reference for image-gen of the next segment.
    """
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    slice_px = min(slice_px, w)
    cropped = img.crop((w - slice_px, 0, w, h))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(out_path, format="PNG")


def extract_left_slice(image_path: Path, slice_px: int, out_path: Path) -> None:
    """Save the left-most `slice_px` columns of an image to `out_path`.

    Mirror of `extract_right_slice` — used by `build_transition_input` to
    pull the left edge of the right-side seed for a transition canvas.
    """
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    slice_px = min(slice_px, w)
    cropped = img.crop((0, 0, slice_px, h))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(out_path, format="PNG")


def build_transition_input(
    left_seed_path: Path,
    right_seed_path: Path,
    chunk_width: int,
    chunk_height: int,
    *,
    side_strip_px: int | None = None,
    out_path: Path,
) -> None:
    """Build a chunk-sized canvas that the model fills as a transition.

    Layout (left → right):
        [ side_strip_px columns | center filled with #00FF00 | side_strip_px columns ]
        ^                       ^                            ^
        |                       |                            |
        right edge of left_seed |                            left edge of right_seed
                                pure chroma-green region
                                (this is what the model fills in)

    The model is shown the canvas and asked to paint into the green
    region while preserving the side strips. The chroma-keyer then
    removes any leftover green and the despill pass cleans halos.

    Args:
        left_seed_path:  PNG whose RIGHT edge is the visible left strip.
        right_seed_path: PNG whose LEFT edge is the visible right strip.
        chunk_width:     output canvas width in pixels.
        chunk_height:    output canvas height in pixels.
        side_strip_px:   width of each visible side strip (default
                         chunk_width // 4 — ~25% per side, ~50% green).
        out_path:        where to write the canvas PNG.
    """
    if side_strip_px is None:
        side_strip_px = chunk_width // 4
    side_strip_px = max(1, min(side_strip_px, chunk_width // 2 - 1))

    canvas = Image.new("RGBA", (chunk_width, chunk_height), (0, 255, 0, 255))

    # Left strip: rightmost `side_strip_px` columns of left_seed, scaled to
    # chunk_height if needed.
    left_seed = Image.open(left_seed_path).convert("RGBA")
    if left_seed.height != chunk_height:
        new_w = max(1, int(round(left_seed.width * (chunk_height / left_seed.height))))
        left_seed = left_seed.resize((new_w, chunk_height), Image.LANCZOS)
    left_strip = left_seed.crop(
        (max(0, left_seed.width - side_strip_px), 0, left_seed.width, chunk_height)
    )
    canvas.paste(left_strip, (0, 0))

    # Right strip: leftmost `side_strip_px` columns of right_seed.
    right_seed = Image.open(right_seed_path).convert("RGBA")
    if right_seed.height != chunk_height:
        new_w = max(1, int(round(right_seed.width * (chunk_height / right_seed.height))))
        right_seed = right_seed.resize((new_w, chunk_height), Image.LANCZOS)
    right_strip = right_seed.crop(
        (0, 0, min(side_strip_px, right_seed.width), chunk_height)
    )
    canvas.paste(right_strip, (chunk_width - right_strip.width, 0))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, format="PNG")


# ── Chroma-green keying ─────────────────────────────────────────────────────

CHROMA_GREEN_RGB = (0, 255, 0)


def chroma_green_to_alpha(
    img: Image.Image,
    *,
    inner_tolerance: float = 0.40,
    outer_tolerance: float = 0.65,
    despill: bool = True,
) -> Image.Image:
    """Convert pure-green pixels in `img` to alpha=0 with soft fall-off.

    Models can't output a true alpha channel, so the bg-generation prompt
    asks them to render transparent regions as `#00FF00`. This helper
    converts those green pixels to alpha after rendering.

    Method: per-pixel "greenness" score from `G - max(R, B)` — a stable
    measure of how chromatically green a pixel is, robust to the luminance
    drift Gemini adds (greens like (8, 247, 17) match cleanly). Pixels
    where greenness >= `outer_tolerance` are fully transparent; pixels
    with greenness <= `inner_tolerance` stay fully opaque; in between,
    alpha falls off linearly so the seam between transparent and opaque
    is soft (no hard chroma-key edge).

      - inner_tolerance (default 0.40) — keep painterly natural greens
        opaque. For #6CAB3C foliage (108,171,60), greenness=(171-108)/255
        ≈ 0.247, well below 0.40 → full opacity.
      - outer_tolerance (default 0.65) — pure-green sky (#00FF00,
        greenness=1.0) goes fully transparent.

    Despill caps the green channel on edge pixels (alpha < 1) so green
    bleed in painterly outlines doesn't show as a halo.
    """
    arr = np.array(img.convert("RGB"), dtype=np.float64) / 255.0
    h, w, _ = arr.shape

    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    greenness = g - np.maximum(r, b)

    # Linear fall-off: alpha=1 below inner_tolerance, alpha=0 above outer.
    # In between, it ramps down so the keying isn't a hard edge.
    if outer_tolerance <= inner_tolerance:
        outer_tolerance = inner_tolerance + 0.01
    alpha = np.clip(
        (outer_tolerance - greenness) / (outer_tolerance - inner_tolerance),
        0.0,
        1.0,
    )

    fg = arr.copy()
    if despill:
        # On semi-transparent or opaque pixels with green leak, cap the
        # green channel to max(R,B) + slack. Painterly foliage (G slightly
        # higher than R,B) keeps its tint; outline pixels with chroma-key
        # bleed get the green pulled down so no halo remains.
        slack = 0.06
        other_max = np.maximum(r, b)
        capped_g = np.minimum(g, other_max + slack)
        # Only despill where alpha is non-zero (otherwise we're zeroing
        # transparent pixels that don't matter).
        despill_mask = alpha > 0.02
        fg[..., 1] = np.where(despill_mask, capped_g, fg[..., 1])

    rgba = np.concatenate([
        (fg * 255).astype(np.uint8),
        (alpha * 255).astype(np.uint8)[..., None],
    ], axis=-1)
    return Image.fromarray(rgba)


# ── Inter-layer transition references ───────────────────────────────────────

def extract_bottom_strip(image_path: Path, strip_h: int, out_path: Path) -> None:
    """Save the bottom `strip_h` rows of an image to `out_path`.

    Used to give the "next layer up" prompt a reference of where the
    layer below ends, so the model can match colors/features at the seam
    and produce a smooth horizontal transition between parallax layers.
    """
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    strip_h = min(strip_h, h)
    cropped = img.crop((0, h - strip_h, w, h))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(out_path, format="PNG")


def extract_top_strip(image_path: Path, strip_h: int, out_path: Path) -> None:
    """Save the top `strip_h` rows of an image to `out_path`. Mirror of
    extract_bottom_strip — used when chaining downward (e.g. near's top
    edge against mid's bottom edge for grounding feature continuity).
    """
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    strip_h = min(strip_h, h)
    cropped = img.crop((0, 0, w, strip_h))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(out_path, format="PNG")
