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
from pathlib import Path
from typing import Any


MODEL = "gemini-3.1-flash-image-preview"


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
                import io
                img = Image.open(io.BytesIO(img_bytes))
                if resize_to_resolution and img.size != (resolution, resolution):
                    img = ImageOps.fit(img, (resolution, resolution), Image.LANCZOS)
                    buf = io.BytesIO()
                    img.save(buf, format="PNG")
                    img_bytes = buf.getvalue()

                return img_bytes, used_seed

    raise SystemExit(f"Gemini response contained no image. model={MODEL}, refs={len(reference_paths or [])}")
