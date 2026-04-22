#!/usr/bin/env python3
"""
generate_sprite_sheet.py — Generate sprite sheets using Nano-banana.

Usage:
  python scripts/generate_sprite_sheet.py <char_id> <char_name> <state> <palette> [--resolution 128]

Outputs:
  spritesheets/{char_id}/{state}.png
  spritesheets/{char_id}/{state}.prompt.txt
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from pathlib import Path

MODEL = "gemini-3.1-flash-image-preview"


def find_project_root_game_assets(start: Path | None = None) -> Path:
    """Walk up from `start` (default: cwd) until sprites.json is found."""
    cur = (start or Path.cwd()).resolve()
    while True:
        if (cur / "sprites.json").exists():
            return cur
        if cur.parent == cur:
            raise FileNotFoundError(
                f"could not locate project root (no sprites.json found "
                f"walking up from {start or Path.cwd()})"
            )
        cur = cur.parent


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


def build_prompt(char_name: str, state: str, palette: str, ref_path: Path | None = None) -> str:
    lines = []
    lines.append(f"You are generating a SPRITE SHEET for game character: {char_name}")
    lines.append("")
    lines.append(f"ANIMATION STATE: {state}")

    if ref_path and ref_path.exists():
        lines.append("")
        lines.append("REFERENCE: Use the provided character reference image for identity consistency.")

    lines.append("")
    lines.append("OUTPUT REQUIREMENTS:")
    lines.append("  - Create a sprite sheet with 4 frames arranged in a grid (2x2)")
    lines.append("  - Each frame shows a different pose for the animation state")
    lines.append("  - Frames should show progression (e.g., for walk: step-left, mid, step-right, mid)")
    lines.append("  - Pixel art style with specified palette constraints")
    lines.append("  - Resolution: 128x128 pixels per frame (512x256 total sheet)")
    lines.append("  - No text, labels, or watermarks")
    lines.append("")
    lines.append(f"Art direction: {palette}")
    lines.append(f"Character: {char_name}")
    lines.append(f"Animation: {state}")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID")
    ap.add_argument("char_name", help="Character name")
    ap.add_argument("state", help="Animation state (e.g., idle, walk)")
    ap.add_argument("palette", help="Art style/palette description")
    ap.add_argument("--ref", help="Path to character reference image")
    ap.add_argument("--resolution", type=int, default=128, help="Sprite resolution (default: 128)")
    ap.add_argument("--sprites-per-row", type=int, default=4, help="Sprites per row (default: 4)")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root_game_assets(Path.cwd())

    # Determine output path
    out_dir = project_root / "spritesheets" / args.char_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{args.state}.png"

    # Collect reference paths
    ref_paths = []
    if args.ref:
        ref_path = Path(args.ref)
        if ref_path.exists():
            ref_paths.append(ref_path)

    # Also check for character ref if available
    char_ref = project_root / "characters" / args.char_id / "ref.png"
    if char_ref.exists():
        ref_paths.append(char_ref)

    # Build prompt
    prompt = build_prompt(args.char_name, args.state, args.palette, ref_paths[0] if ref_paths else None)

    # Save prompt for reference
    prompt_path = out_path.with_suffix(".prompt.txt")
    prompt_path.write_text(prompt, encoding="utf-8")

    # Call API
    print(f"Generating sprite sheet for {args.char_name} / {args.state}...")
    img_bytes, seed_used = call_nano_banana(prompt, ref_paths, seed=args.seed)

    out_path.write_bytes(img_bytes)
    seed_path = out_path.with_suffix(".seed.txt")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    print(f"wrote {out_path.relative_to(project_root)}  seed={seed_used}")
    return 0


if __name__ == "__main__":
    sys.exit(main())