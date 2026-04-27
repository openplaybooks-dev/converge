"""
Image generation dispatcher.

Routes generate_image / generate_image_with_edit to the active backend:
  - `gemini` (default) — Gemini 2.5 Flash Image / nano-banana
  - `openai`           — OpenAI gpt-image-1 with native transparency

Backend selection (highest priority first):
  1. `IMAGE_BACKEND` environment variable
  2. `.converge/skills/image-generate/backends/ACTIVE` file contents
  3. fallback: `gemini`

Re-exports VIEWPORT_CONTRACT and the chroma helpers from the Gemini module
so existing imports (`from lib.image_api import generate_image_with_edit,
VIEWPORT_CONTRACT`) keep working unchanged.
"""

from __future__ import annotations

import os
from pathlib import Path

from lib.image_api_gemini import (
    VIEWPORT_CONTRACT,
    CHROMA_FULL_KEY,
    CHROMA_NO_KEY,
    ensure_transparent_background,
)

__all__ = [
    "generate_image",
    "generate_image_with_edit",
    "VIEWPORT_CONTRACT",
    "CHROMA_FULL_KEY",
    "CHROMA_NO_KEY",
    "ensure_transparent_background",
    "active_backend",
]


def active_backend() -> str:
    env = os.environ.get("IMAGE_BACKEND")
    if env:
        return env.strip().lower()
    # scripts/lib/image_api.py -> parents[2] is the example root
    active_file = (
        Path(__file__).resolve().parents[2]
        / ".converge" / "skills" / "image-generate" / "backends" / "ACTIVE"
    )
    if active_file.exists():
        name = active_file.read_text().strip().lower()
        if name:
            return name
    return "gemini"


def _impl_module(backend: str):
    if backend == "openai":
        from lib import image_api_openai
        return image_api_openai
    if backend == "gemini":
        from lib import image_api_gemini
        return image_api_gemini
    raise SystemExit(
        f"Unknown image backend: {backend!r}. "
        f"Set IMAGE_BACKEND or .converge/skills/image-generate/backends/ACTIVE to 'gemini' or 'openai'."
    )


def generate_image(prompt, reference_paths=None, **kwargs):
    return _impl_module(active_backend()).generate_image(prompt, reference_paths, **kwargs)


def generate_image_with_edit(prompt, base_image_path, reference_paths=None, **kwargs):
    return _impl_module(active_backend()).generate_image_with_edit(
        prompt, base_image_path, reference_paths, **kwargs
    )
