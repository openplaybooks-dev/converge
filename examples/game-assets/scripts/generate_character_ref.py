#!/usr/bin/env python3
"""
generate_character_ref.py — Generate character reference sheets using Nano-banana.

Usage:
  python scripts/generate_character_ref.py <char_id> <char_name> <char_palette> [--output <path>]

Outputs:
  characters/{char_id}/ref.png
  characters/{char_id}/ref.prompt.txt
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from pathlib import Path

MODEL = "gemini-3.1-flash-image-preview"


def call_nano_banana(prompt: str, reference_paths: list[Path], *, seed: int | None = None) -> tuple[bytes, int]:
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

    parts: list[object] = []
    for p in reference_paths:
        data = p.read_bytes()
        ext = p.suffix.lower()
        mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}.get(ext, "image/png")
        parts.append(types.Part.from_bytes(data=data, mime_type=mime))
    parts.append(types.Part.from_text(text=prompt))

    contents = [types.Content(role="user", parts=parts)]
    used_seed = seed if seed is not None else random.randint(1, 2_000_000_000)

    config = types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])

    for chunk in client.models.generate_content_stream(model=MODEL, contents=contents, config=config):
        if chunk.parts is None:
            continue
        for part in chunk.parts:
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                return inline.data, used_seed

    raise SystemExit(f"Gemini response contained no image. model={MODEL}, refs={len(reference_paths)}")


def build_prompt(char_name: str, char_description: str, char_palette: str) -> str:
    lines = []
    lines.append(f"You are generating a GAME CHARACTER REFERENCE SHEET for: {char_name}")
    lines.append("")
    lines.append("CHARACTER DETAILS:")
    lines.append(f"  - Name: {char_name}")
    lines.append(f"  - Description: {char_description}")
    lines.append(f"  - Art Style/Palette: {char_palette}")
    lines.append("")
    lines.append("OUTPUT REQUIREMENTS:")
    lines.append("  - Create a reference sheet showing the character in a clear, iconic pose")
    lines.append("  - Include front-facing view as the primary pose")
    lines.append("  - Show character clearly with all distinctive visual elements visible")
    lines.append("  - Pixel art style with the specified palette constraints")
    lines.append("  - Resolution: 128x128 pixels")
    lines.append("  - No text, labels, or watermarks")
    lines.append("")
    lines.append(f"Art direction: {char_palette}")
    return "\n".join(lines)


def find_project_root_game_assets(start: Path | None = None) -> Path:
    """Walk up from `start` (default: cwd) until sprites.json is found."""
    cur = (start or Path.cwd()).resolve()
    while True:
        if (cur / "sprites.json").exists():
            return cur
        if (cur / "characters").exists() and (cur / "sprites.json").exists():
            return cur
        if cur.parent == cur:
            raise FileNotFoundError(
                f"could not locate project root (no sprites.json found "
                f"walking up from {start or Path.cwd()})"
            )
        cur = cur.parent


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID (e.g., hero-knight)")
    ap.add_argument("char_name", help="Character name (e.g., Sir Aldric)")
    ap.add_argument("char_description", help="Character description")
    ap.add_argument("char_palette", help="Art style/palette description")
    ap.add_argument("--output", "-o", help="Output path (default: characters/{char_id}/ref.png)")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root_game_assets(Path.cwd())

    # Determine output path
    if args.output:
        out_path = Path(args.output)
    else:
        out_dir = project_root / "characters" / args.char_id
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "ref.png"

    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Build prompt
    prompt = build_prompt(args.char_name, args.char_description, args.char_palette)

    # Save prompt for reference
    prompt_path = out_path.with_suffix(".prompt.txt")
    prompt_path.write_text(prompt, encoding="utf-8")

    # Call API
    print(f"Generating reference for {args.char_name}...")
    img_bytes, seed_used = call_nano_banana(prompt, [], seed=args.seed)

    out_path.write_bytes(img_bytes)
    seed_path = out_path.with_suffix(".seed.txt")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    print(f"wrote {out_path.relative_to(project_root)}  seed={seed_used}")
    return 0


if __name__ == "__main__":
    sys.exit(main())