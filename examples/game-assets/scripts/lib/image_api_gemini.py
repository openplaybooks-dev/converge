"""
Gemini 2.5 Flash Image (Nano-banana) implementation of the image_api contract.

Selected by `.converge/skills/image-generate/backends/ACTIVE` containing
`gemini` (the default) or by `IMAGE_BACKEND=gemini`.
"""

from __future__ import annotations

import os
import random
import io
from pathlib import Path
from typing import Any
import numpy as np


MODEL = "gemini-3.1-flash-image-preview"


# Viewport contract. Injected verbatim into every sprite prompt (angle
# references AND animation frames) so the camera, framing, and lens never
# drift between calls. Only rotation_y varies between angles; everything
# else is locked. Without this, Gemini picks camera height, distance, and
# lens implicitly per call, and the same character drifts across frames.
VIEWPORT_CONTRACT = (
    "Viewport (locked, identical across every reference and every animation frame "
    "of this character — do not deviate):\n"
    "- Orthographic camera (no perspective foreshortening), parallel projection.\n"
    "- Camera height: chest level. Look straight at the character (camera tilt / "
    "rotation_x = 0°). No high angle, no low angle, no Dutch tilt.\n"
    "- Distance / framing: full body fits in the square frame with ~10% padding "
    "on top, bottom, left, and right. Feet near the bottom edge, head near the top.\n"
    "- Character is centered horizontally. The ground line (where feet stand) is "
    "at the same Y in every frame.\n"
    "- Sprite scale stays identical across frames — do not zoom in or out, do not "
    "resize the character between frames.\n"
    "- No ground plane drawn, no shadow cast on the ground, no environment.\n"
)


# Chroma key tuning. Single source of truth for both generate_image and
# generate_image_with_edit so the two callers cannot disagree on what
# counts as background.
CHROMA_FULL_KEY = 160   # green dominance >= this -> fully transparent
CHROMA_NO_KEY = 40      # green dominance <= this -> fully opaque
                        # values in between produce a continuous alpha ramp


def ensure_transparent_background(img_bytes: bytes) -> bytes:
    """
    Remove the green-screen background and despill green-tinted edges.

    Continuous alpha matting (not 0/255 binary). No brightness fallback —
    the prompt requires a #00FF00 background, so bright sprite pixels
    (white armor, pale skin) must stay opaque.
    """
    from PIL import Image

    img = Image.open(io.BytesIO(img_bytes))
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    data = np.array(img).astype(np.int16)
    r = data[:, :, 0]
    g = data[:, :, 1]
    b = data[:, :, 2]

    # Green dominance: how much greener the pixel is than its strongest
    # non-green channel. Pure #00FF00 -> 255. Pure red/blue -> negative.
    spill = g - np.maximum(r, b)

    # Despill: pull the green channel down toward max(r, b) on edges
    # where green leaked into the sprite's antialiased outline. This kills
    # the green halo before it ever shows up in the final RGB.
    despill_mask = spill > 0
    g_despilled = np.where(despill_mask, np.maximum(r, b), g)

    # Continuous alpha ramp: opaque below CHROMA_NO_KEY, transparent above
    # CHROMA_FULL_KEY, linear in between. This produces antialiased edges
    # rather than the previous stair-step cutout.
    alpha = np.where(
        spill <= CHROMA_NO_KEY,
        255,
        np.where(
            spill >= CHROMA_FULL_KEY,
            0,
            255 * (CHROMA_FULL_KEY - spill) // (CHROMA_FULL_KEY - CHROMA_NO_KEY),
        ),
    )

    out = np.empty_like(data, dtype=np.uint8)
    out[:, :, 0] = r
    out[:, :, 1] = g_despilled
    out[:, :, 2] = b
    out[:, :, 3] = alpha.astype(np.uint8)

    result = Image.fromarray(out, 'RGBA')
    buf = io.BytesIO()
    result.save(buf, format='PNG')
    return buf.getvalue()


def _resolve_size(resolution: int | tuple[int, int]) -> tuple[int, int]:
    """Normalize resolution arg: int means square; tuple means (width, height)."""
    if isinstance(resolution, int):
        return (resolution, resolution)
    return resolution


def generate_image(
    prompt: str,
    reference_paths: list[Path] | None = None,
    *,
    seed: int | str | None = None,
    aspect_ratio: str = "1:1",
    quality: str = "final",
    resolution: int | tuple[int, int] = 128,
    resize_to_resolution: bool = True,
) -> tuple[bytes, int]:
    """Send prompt (+optional refs) to Gemini 2.5 Flash Image. Returns (png_bytes, seed).

    resolution: pass an int N for an N×N square, or (width, height) for a strip
    (e.g. (512, 128) for a 4-frame horizontal sprite sheet).
    """
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise SystemExit("google-genai SDK not installed. Run: pip install -r scripts/requirements.txt") from exc

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY not set. Export it first: export GEMINI_API_KEY=...")

    client = genai.Client(api_key=api_key)

    parts: list[Any] = []
    for p in (reference_paths or []):
        data = p.read_bytes()
        ext = p.suffix.lower()
        mime = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
        }.get(ext, "image/png")
        parts.append(types.Part.from_bytes(data=data, mime_type=mime))
    parts.append(types.Part.from_text(text=prompt))

    contents = [types.Content(role="user", parts=parts)]
    used_seed = seed if isinstance(seed, int) else random.randint(1, 2_000_000_000)

    config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
        seed=used_seed,
    )

    for chunk in client.models.generate_content_stream(model=MODEL, contents=contents, config=config):
        if chunk.parts is None:
            continue
        for part in chunk.parts:
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                img_bytes = inline.data

                # Enforce resolution via Pillow post-processing. The model
                # is instructed to output native transparency in the prompt;
                # we don't run the chroma keyer anymore.
                from PIL import Image, ImageOps
                img = Image.open(io.BytesIO(img_bytes))
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                target = _resolve_size(resolution)
                if resize_to_resolution and img.size != target:
                    img = ImageOps.fit(img, target, Image.LANCZOS)
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                return buf.getvalue(), used_seed

    raise SystemExit(f"Gemini response contained no image. model={MODEL}, refs={len(reference_paths or [])}")


def generate_image_with_edit(
    prompt: str,
    base_image_path: Path,
    reference_paths: list[Path] | None = None,
    *,
    seed: int | str | None = None,
    aspect_ratio: str = "1:1",
    quality: str = "final",
    resolution: int | tuple[int, int] = 128,
) -> tuple[bytes, int]:
    """
    Edit a base image (green template) by adding character based on prompt.
    This ensures consistent technical properties (size, format, green background).
    """
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise SystemExit("google-genai SDK not installed. Run: pip install -r scripts/requirements.txt") from exc

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY not set. Export it first: export GEMINI_API_KEY=...")

    client = genai.Client(api_key=api_key)

    base_data = base_image_path.read_bytes()
    parts: list[Any] = [
        types.Part.from_bytes(data=base_data, mime_type="image/png")
    ]

    for p in (reference_paths or []):
        data = p.read_bytes()
        ext = p.suffix.lower()
        mime = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
        }.get(ext, "image/png")
        parts.append(types.Part.from_bytes(data=data, mime_type=mime))

    parts.append(types.Part.from_text(text=prompt))

    contents = [types.Content(role="user", parts=parts)]
    used_seed = seed if isinstance(seed, int) else random.randint(1, 2_000_000_000)

    config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
        seed=used_seed,
    )

    for chunk in client.models.generate_content_stream(model=MODEL, contents=contents, config=config):
        if chunk.parts is None:
            continue
        for part in chunk.parts:
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                img_bytes = inline.data

                # Enforce resolution + RGBA. Native transparency comes from
                # the prompt; no chroma keyer.
                from PIL import Image, ImageOps
                img = Image.open(io.BytesIO(img_bytes))
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                target = _resolve_size(resolution)
                if img.size != target:
                    img = ImageOps.fit(img, target, Image.LANCZOS)
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                return buf.getvalue(), used_seed

    raise SystemExit(f"Gemini response contained no image. model={MODEL}")
