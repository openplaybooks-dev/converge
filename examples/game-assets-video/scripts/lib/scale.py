"""scale.py — Programmatic post-process scale lock for generated assets.

Image-gen models can't be reliably told "render at exactly N tiles tall."
The right place to enforce subject sizing is AFTER generation, by measuring
the actual opaque/content height in pixels and rescaling the image so
that height matches the declared target.

Public API:
  - lock_subject_height(rgba_image, target_height_tiles, tile_px,
                        baseline='bottom') -> Image.Image

The function returns a NEW image with the same canvas dimensions as the
input. The opaque content's vertical extent is rescaled so it matches
target_height_tiles × tile_px in pixels, then re-pasted onto the canvas
anchored at the requested baseline (default 'bottom' = ground-aligned).

Used by generate_scene_background.py as the final step on each layer.
Idempotent — running it twice on the same image produces the same output.
"""

from __future__ import annotations

from typing import Literal

import numpy as np
from PIL import Image


def opaque_bbox(img: Image.Image, alpha_threshold: int = 16) -> tuple[int, int, int, int] | None:
    """Tight bounding box of pixels with alpha > threshold.

    Returns (left, top, right, bottom) in PIL convention, or None if the
    image is entirely transparent. Used to find the actual content extent
    of a chroma-keyed layer.
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    alpha = np.asarray(img.split()[-1], dtype=np.uint8)
    mask = alpha > alpha_threshold
    if not mask.any():
        return None
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    top, bottom = int(np.argmax(rows)), int(len(rows) - 1 - np.argmax(rows[::-1]))
    left, right = int(np.argmax(cols)), int(len(cols) - 1 - np.argmax(cols[::-1]))
    # PIL bbox uses exclusive right/bottom.
    return (left, top, right + 1, bottom + 1)


def lock_subject_height(
    img: Image.Image,
    target_height_tiles: float,
    tile_px: int = 16,
    *,
    baseline: Literal["bottom", "top", "center"] = "bottom",
    bg_fill: tuple[int, int, int, int] = (0, 0, 0, 0),
    min_scale: float = 0.5,
    max_scale: float = 2.0,
    preserve_horizontal: bool = False,
) -> tuple[Image.Image, dict]:
    """Rescale `img` so its opaque content height in pixels equals
    `target_height_tiles × tile_px`, then re-paste onto a same-sized canvas
    anchored at `baseline`.

    Returns (new_image, info_dict). info_dict has keys:
        original_bbox      bbox of opaque content in input
        original_height_px height of bbox in input
        target_height_px   target height in pixels
        scale_factor       factor used (clamped to [min_scale, max_scale])
        was_clamped        True if the requested scale was clipped
        new_bbox           bbox of opaque content in output (after re-paste)

    Notes:
      - For mid/near layers (chroma-keyed sky → alpha=0), the bbox is the
        actual subject. Scaling that to a target locks the subject's tile
        height regardless of what the model produced.
      - For opaque layers (no transparency), the bbox is the full canvas,
        so this function is essentially a no-op (scale_factor ≈ 1.0). That's
        fine — opaque layers don't need scale locking.
      - `min_scale`/`max_scale` cap how aggressively we'll resize. A 5x
        rescale of a model output produces ugly artifacts; the caller is
        warned via was_clamped=True if the model produced a wildly off-
        scale result, so they can re-run instead of accepting bad output.
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    canvas_w, canvas_h = img.size

    bbox = opaque_bbox(img)
    info: dict = {
        "original_bbox": bbox,
        "original_height_px": None,
        "target_height_px": int(round(target_height_tiles * tile_px)),
        "scale_factor": 1.0,
        "was_clamped": False,
        "new_bbox": None,
    }

    if bbox is None:
        # Empty / fully transparent input — return as-is.
        return img.copy(), info

    left, top, right, bottom = bbox
    orig_h_px = bottom - top
    info["original_height_px"] = orig_h_px

    if orig_h_px <= 0:
        return img.copy(), info

    target_h_px = info["target_height_px"]
    raw_scale = target_h_px / orig_h_px
    clamped_scale = max(min_scale, min(max_scale, raw_scale))
    info["scale_factor"] = clamped_scale
    info["was_clamped"] = (clamped_scale != raw_scale)

    # If we're already very close to target (within 5%), skip the
    # resample to avoid lossy operations.
    if abs(clamped_scale - 1.0) < 0.05:
        info["new_bbox"] = bbox
        return img.copy(), info

    # Resize the image. Two modes:
    #   - default (preserve_horizontal=False): resize whole image by
    #     scale factor — content + transparent surroundings shrink/grow
    #     uniformly. Suitable for single-subject layers (props, hero).
    #   - preserve_horizontal=True: scale ONLY in Y, keep canvas width
    #     intact. Suitable for WIDE STRIP backgrounds where horizontal
    #     positions matter and we don't want a centered band of content
    #     with empty side margins.
    if preserve_horizontal:
        new_w = canvas_w
    else:
        new_w = max(1, int(round(canvas_w * clamped_scale)))
    new_h = max(1, int(round(canvas_h * clamped_scale)))
    resized = img.resize((new_w, new_h), Image.LANCZOS)

    # Paste back onto the original canvas size. Anchor as requested.
    out = Image.new("RGBA", (canvas_w, canvas_h), bg_fill)

    # Find the new bbox in the resized image so we can position it
    # against the canvas baseline accurately.
    new_bbox = opaque_bbox(resized)
    if new_bbox is None:
        return out, info
    n_left, n_top, n_right, n_bottom = new_bbox
    n_h = n_bottom - n_top
    n_w = n_right - n_left

    # Paste position so the bbox lands at the requested baseline of the
    # target canvas.
    if baseline == "bottom":
        paste_y = canvas_h - n_h - n_top
    elif baseline == "top":
        paste_y = -n_top
    else:  # center
        paste_y = (canvas_h - n_h) // 2 - n_top

    if preserve_horizontal:
        # Keep horizontal positions (resized width matches canvas width).
        paste_x = 0
    else:
        # Horizontally center the bbox on the canvas (most natural for a
        # subject-locked single-element layer).
        paste_x = (canvas_w - n_w) // 2 - n_left

    out.paste(resized, (paste_x, paste_y), resized)

    info["new_bbox"] = opaque_bbox(out)
    return out, info
