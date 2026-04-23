"""
Shared image generation helpers using Gemini 2.5 Flash Image (Nano-banana).

Used by:
  - generate_character_ref.py
  - generate_object_sheet.py
  - generate_sprite_sheet.py
  - generate_keyframes.py
  - generate_background_ref.py
"""

from __future__ import annotations

import os
import random
import io
from pathlib import Path
from typing import Any
import numpy as np


MODEL = "gemini-3.1-flash-image-preview"


def ensure_transparent_background(img_bytes: bytes, threshold: int = 220) -> bytes:
    """
    Post-process image to remove green screen (chroma key) background.
    Converts green pixels to transparent, creating proper alpha channel.

    Args:
        img_bytes: Input image bytes (should have green screen background)
        threshold: Color distance threshold for green detection (lower = stricter)

    Returns:
        PNG bytes with transparent background
    """
    from PIL import Image

    img = Image.open(io.BytesIO(img_bytes))

    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Get pixel data
    data = np.array(img)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    # Chroma key: detect green pixels
    # Green screen is typically #00FF00 or close to it
    # A pixel is "green screen" if:
    # 1. Green channel is dominant (g > r and g > b)
    # 2. Green channel is bright (g > 100)
    # 3. Red and blue are relatively low

    is_green = (g > r + 30) & (g > b + 30) & (g > 100)

    # Also catch bright/light backgrounds (fallback for non-green backgrounds)
    brightness = (r.astype(int) + g.astype(int) + b.astype(int)) / 3
    is_bright = brightness > threshold

    # Combine: remove green OR very bright pixels
    is_background = is_green | is_bright

    # Set alpha to 0 for background pixels
    data[:,:,3] = np.where(is_background, 0, 255)

    # Create new image with transparency
    result = Image.fromarray(data, 'RGBA')

    # Save to bytes
    buf = io.BytesIO()
    result.save(buf, format='PNG')
    return buf.getvalue()


def generate_image(
    prompt: str,
    reference_paths: list[Path] | None = None,
    *,
    seed: int | str | None = None,
    aspect_ratio: str = "1:1",
    quality: str = "final",
    resolution: int = 128,
    resize_to_resolution: bool = True,
) -> tuple[bytes, int]:
    """Send prompt (+optional refs) to Gemini 2.5 Flash Image. Returns (png_bytes, seed)."""
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

    config = types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])

    for chunk in client.models.generate_content_stream(model=MODEL, contents=contents, config=config):
        if chunk.parts is None:
            continue
        for part in chunk.parts:
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                img_bytes = inline.data
                used_seed = seed if isinstance(seed, int) else random.randint(1, 2_000_000_000)

                # Enforce resolution via Pillow post-processing (skip for sprite sheets)
                from PIL import Image, ImageOps
                img = Image.open(io.BytesIO(img_bytes))
                if resize_to_resolution and img.size != (resolution, resolution):
                    img = ImageOps.fit(img, (resolution, resolution), Image.LANCZOS)
                    buf = io.BytesIO()
                    img.save(buf, format="PNG")
                    img_bytes = buf.getvalue()

                # Apply transparency post-processing for game sprites
                img_bytes = ensure_transparent_background(img_bytes, threshold=240)

                return img_bytes, used_seed

    raise SystemExit(f"Gemini response contained no image. model={MODEL}, refs={len(reference_paths or [])}")


def generate_image_with_edit(
    prompt: str,
    base_image_path: Path,
    reference_paths: list[Path] | None = None,
    *,
    seed: int | str | None = None,
    aspect_ratio: str = "1:1",
    quality: str = "final",
    resolution: int = 128,
) -> tuple[bytes, int]:
    """
    Edit a base image (green template) by adding character based on prompt.
    This ensures consistent technical properties (size, format, green background).

    Args:
        prompt: Description of what to add to the image
        base_image_path: Path to green template image
        reference_paths: Optional reference images for character identity
        seed: Random seed for reproducibility
        aspect_ratio: Image aspect ratio
        quality: Generation quality
        resolution: Target resolution

    Returns:
        Tuple of (image_bytes, seed_used)
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

    # Load base image (green template)
    base_data = base_image_path.read_bytes()
    parts: list[Any] = [
        types.Part.from_bytes(data=base_data, mime_type="image/png")
    ]

    # Add reference images if provided
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

    # Add prompt
    parts.append(types.Part.from_text(text=prompt))

    contents = [types.Content(role="user", parts=parts)]
    used_seed = seed if isinstance(seed, int) else random.randint(1, 2_000_000_000)

    config = types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])

    for chunk in client.models.generate_content_stream(model=MODEL, contents=contents, config=config):
        if chunk.parts is None:
            continue
        for part in chunk.parts:
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                img_bytes = inline.data

                # Resize to target resolution
                from PIL import Image, ImageOps
                img = Image.open(io.BytesIO(img_bytes))
                if img.size != (resolution, resolution):
                    img = ImageOps.fit(img, (resolution, resolution), Image.LANCZOS)
                    buf = io.BytesIO()
                    img.save(buf, format="PNG")
                    img_bytes = buf.getvalue()

                # Apply chroma key post-processing
                img_bytes = ensure_transparent_background(img_bytes, threshold=220)

                return img_bytes, used_seed

    raise SystemExit(f"Gemini response contained no image. model={MODEL}")
