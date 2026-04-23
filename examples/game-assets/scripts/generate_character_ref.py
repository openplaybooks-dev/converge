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

from lib.image_api import generate_image, generate_image_with_edit
from lib.sprite import find_project_root
from lib.composition_meta import (
    CompositionMeta, BaseRef, ArtStyle, InputAsset,
    write_compose_json, load_art_style
)


def build_edit_prompt(char_name: str, char_description: str, char_palette: str) -> str:
    """Build prompt for editing green template with character."""
    import json

    prompt_data = {
        "task": "edit_image_add_character",
        "instruction": "Add a game character sprite to this green background image",
        "character": {
            "name": char_name,
            "description": char_description
        },
        "technical_requirements": {
            "format": "pixel_art",
            "keep_green_background": True,
            "do_not_change_background": True,
            "only_add_character": True,
            "palette": char_palette,
            "style": "16bit_retro_game_sprite"
        },
        "composition": {
            "pose": "standing_neutral_idle",
            "view": "front_facing",
            "framing": "full_body_centered_in_frame",
            "character_centered": True,
            "no_green_in_character": True,
            "avoid_green_colors_in_sprite": True,
            "clean_sprite_cutout": True
        },
        "critical_instructions": [
            "KEEP THE GREEN BACKGROUND UNCHANGED",
            "Only add the character sprite to the center",
            "Do NOT use green colors in the character",
            "Character should be pixel art style",
            "Keep background solid green for chroma keying"
        ]
    }

    json_str = json.dumps(prompt_data, indent=2)

    return f"""Edit this green background image by adding a character sprite:

{json_str}

CRITICAL: Keep the green background (#00FF00) unchanged. Only add the character sprite in the center. Do NOT use green colors in the character itself."""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID (e.g., hero-knight)")
    ap.add_argument("char_name", help="Character name (e.g., Sir Aldric)")
    ap.add_argument("char_description", help="Character description")
    ap.add_argument("char_palette", help="Art style/palette description")
    ap.add_argument("--output", "-o", help="Output path (default: characters/{char_id}/ref.png)")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--use-template", action="store_true", default=True, help="Use green template for editing (default: True)")
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
    if args.use_template:
        prompt = build_edit_prompt(args.char_name, args.char_description, args.char_palette)

        # Use green template
        template_path = project_root / ".templates" / "green_128x128.png"
        if not template_path.exists():
            print(f"Error: Green template not found at {template_path}", file=sys.stderr)
            print("Run: python scripts/create_green_template.py", file=sys.stderr)
            return 1

        print(f"Generating reference for {args.char_name} using green template...")
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            template_path,
            [],
            seed=args.seed
        )
    else:
        # Fallback to direct generation
        prompt = build_edit_prompt(args.char_name, args.char_description, args.char_palette)
        print(f"Generating reference for {args.char_name}...")
        img_bytes, seed_used = generate_image(prompt, [], seed=args.seed)

    # Save prompt for reference
    prompt_path = out_path.with_suffix(".prompt.txt")
    prompt_path.write_text(prompt, encoding="utf-8")

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
