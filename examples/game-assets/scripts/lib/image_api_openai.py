"""
OpenAI gpt-image-1 implementation of the image_api contract.

Selected by `.converge/skills/image-generate/backends/ACTIVE` containing
`openai`, or by `IMAGE_BACKEND=openai`.

Differences vs the Gemini path:
  - Native transparent background via `background="transparent"` — the
    chroma-key/despill post-process is skipped.
  - Reference images go through `client.images.edit` (gpt-image-1's way
    of using prior images as visual context).
  - gpt-image-1 ignores `seed`. We still echo a seed back so callers'
    `.seed.txt` bookkeeping stays populated.
  - gpt-image-1 only supports three sizes (1024x1024, 1536x1024,
    1024x1536). We pick the closest one and resize down to the requested
    `resolution` with PIL.
"""

from __future__ import annotations

import base64
import io
import os
import random
from pathlib import Path


MODEL = "gpt-image-1"


def _resolve_size(resolution: int | tuple[int, int]) -> tuple[int, int]:
    if isinstance(resolution, int):
        return (resolution, resolution)
    return resolution


def _api_size_for_aspect(aspect_ratio: str) -> str:
    # gpt-image-1 currently supports only these three sizes.
    mapping = {
        "1:1": "1024x1024",
        "16:9": "1536x1024",
        "9:16": "1024x1536",
        "4:3": "1536x1024",
        "3:4": "1024x1536",
    }
    return mapping.get(aspect_ratio, "1024x1024")


def _api_quality(quality: str) -> str:
    return "low" if quality == "draft" else "high"


def _client():
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise SystemExit("openai SDK not installed. Run: pip install -r scripts/requirements.txt") from exc

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY not set. Export it first: export OPENAI_API_KEY=...")
    return OpenAI(api_key=api_key)


def _decode_first_image(response) -> bytes:
    data = getattr(response, "data", None)
    if not data:
        raise SystemExit(f"OpenAI response contained no image. model={MODEL}")
    b64 = getattr(data[0], "b64_json", None)
    if not b64:
        raise SystemExit(f"OpenAI response missing b64_json. model={MODEL}")
    return base64.b64decode(b64)


def _postprocess(img_bytes: bytes, resolution: int | tuple[int, int], resize: bool = True) -> bytes:
    """Resize + ensure RGBA. Transparency comes from the prompt + the API's
    `background="transparent"` flag — no chroma keyer."""
    from PIL import Image, ImageOps

    img = Image.open(io.BytesIO(img_bytes))
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    target = _resolve_size(resolution)
    if resize and img.size != target:
        img = ImageOps.fit(img, target, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _open_for_upload(path: Path):
    # The OpenAI SDK accepts file-like objects with a name; opening with
    # a Path keeps the suffix so the upload is recognised as PNG/JPEG.
    return open(path, "rb")


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
    """gpt-image-1 generate (or edit, when references are provided)."""
    client = _client()
    used_seed = seed if isinstance(seed, int) else random.randint(1, 2_000_000_000)

    size = _api_size_for_aspect(aspect_ratio)
    qual = _api_quality(quality)

    refs = list(reference_paths or [])
    files = []
    try:
        if refs:
            files = [_open_for_upload(p) for p in refs]
            response = client.images.edit(
                model=MODEL,
                image=files if len(files) > 1 else files[0],
                prompt=prompt,
                size=size,
                quality=qual,
                background="transparent",
                n=1,
            )
        else:
            response = client.images.generate(
                model=MODEL,
                prompt=prompt,
                size=size,
                quality=qual,
                background="transparent",
                n=1,
            )
    finally:
        for f in files:
            f.close()

    img_bytes = _decode_first_image(response)
    img_bytes = _postprocess(img_bytes, resolution, resize=resize_to_resolution)
    return img_bytes, used_seed


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
    """gpt-image-1 edit with a base image plus optional references.

    The "green template" base image is included so the prompt's framing /
    scale instructions still have a visual anchor, even though gpt-image-1
    returns a transparent background natively.
    """
    client = _client()
    used_seed = seed if isinstance(seed, int) else random.randint(1, 2_000_000_000)

    size = _api_size_for_aspect(aspect_ratio)
    qual = _api_quality(quality)

    paths = [base_image_path, *(reference_paths or [])]
    files = []
    try:
        files = [_open_for_upload(p) for p in paths]
        response = client.images.edit(
            model=MODEL,
            image=files if len(files) > 1 else files[0],
            prompt=prompt,
            size=size,
            quality=qual,
            background="transparent",
            n=1,
        )
    finally:
        for f in files:
            f.close()

    img_bytes = _decode_first_image(response)
    img_bytes = _postprocess(img_bytes, resolution, resize=True)
    return img_bytes, used_seed
