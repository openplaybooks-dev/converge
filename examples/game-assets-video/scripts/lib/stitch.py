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
