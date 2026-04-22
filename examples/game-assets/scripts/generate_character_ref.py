#!/usr/bin/env python3
"""
generate_character_ref.py — Generate character reference sheets using Nano-banana.

Usage:
  python scripts/generate_character_ref.py <char_id> <char_name> <char_description> <char_palette> [--output <path>]

Outputs:
  assets/characters/{char_id}/ref/ref.png
  assets/characters/{char_id}/ref/ref.prompt.txt
  assets/characters/{char_id}/SPEC.md
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from lib.image_api import generate_image
from lib.sprite import find_project_root
from lib.composition_meta import (
    CompositionMeta, BaseRef, ArtStyle, InputAsset,
    write_compose_json, load_art_style
)


def build_prompt(char_name: str, char_description: str, char_palette: str) -> str:
    lines = []
    lines.append(f"You are generating a SINGLE GAME CHARACTER REFERENCE IMAGE for: {char_name}")
    lines.append("")
    lines.append("CHARACTER DETAILS:")
    lines.append(f"  - Name: {char_name}")
    lines.append(f"  - Description: {char_description}")
    lines.append(f"  - Art Style/Palette: {char_palette}")
    lines.append("")
    lines.append("OUTPUT REQUIREMENTS:")
    lines.append("  - Generate ONE single character portrait/ref image")
    lines.append("  - Character should be in a calm, neutral standing pose")
    lines.append("  - Front-facing view is preferred")
    lines.append("  - Show character clearly with all distinctive visual elements visible")
    lines.append("  - Pixel art style with the specified palette constraints")
    lines.append("  - Resolution: 128x128 pixels")
    lines.append("  - No multiple poses, no reference SHEET, just ONE image")
    lines.append("  - No text, labels, or watermarks")
    lines.append("")
    lines.append(f"Art direction: {char_palette}")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID (e.g., hero-knight)")
    ap.add_argument("char_name", help="Character name (e.g., Sir Aldric)")
    ap.add_argument("char_description", help="Character description")
    ap.add_argument("char_palette", help="Art style/palette description")
    ap.add_argument("--output", "-o", help="Output path (default: characters/{char_id}/ref.png)")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    # Determine output path
    if args.output:
        out_path = Path(args.output)
    else:
        out_dir = project_root / "assets" / "characters" / args.char_id / "ref"
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
    img_bytes, seed_used = generate_image(prompt, [], seed=args.seed)

    out_path.write_bytes(img_bytes)
    seed_path = out_path.with_suffix(".seed.txt")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    # Save SPEC.md
    spec_path = out_path.parent.parent / "SPEC.md"
    spec_path.write_text(
        f"# {args.char_name}\n\n"
        f"**ID:** {args.char_id}\n"
        f"**Palette:** {args.char_palette}\n\n"
        f"## Description\n\n{args.char_description}\n",
        encoding="utf-8"
    )

    print(f"wrote {out_path.relative_to(project_root)}  seed={seed_used}")

    # Write composition metadata
    art_style = load_art_style(project_root)
    meta = CompositionMeta(
        asset_type="ref",
        asset_id=args.char_id,
        role="ref",
        output_path=str(out_path.relative_to(project_root)),
        art_style=art_style,
        prompt=prompt,
        seed=seed_used,
        model="gemini-3.1-flash-image-preview",
        resolution=(128, 128),
        inputs=[],
        parent=None  # root of pipeline, no parent
    )
    write_compose_json(out_path, meta)

    return 0


if __name__ == "__main__":
    sys.exit(main())
