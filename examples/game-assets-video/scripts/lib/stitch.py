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
