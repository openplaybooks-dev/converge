#!/usr/bin/env python3
"""
generate_secondary_refs.py — Generate secondary references (poses, expressions) by editing primary refs.

Uses the original green screen reference images and edits them to create variations.
This ensures consistency since all refs derive from the same base character.

Usage:
  python scripts/generate_secondary_refs.py <char_id> <ref_type> <variation_name> <edit_prompt>

Examples:
  python scripts/generate_secondary_refs.py forest-elf pose attack "Character in attacking pose with bow drawn"
  python scripts/generate_secondary_refs.py hero-knight expression angry "Character with angry facial expression"
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib.image_api import generate_image_with_edit
from lib.sprite import find_project_root


def build_secondary_ref_prompt(
    char_name: str,
    ref_type: str,
    variation_name: str,
    edit_description: str,
    palette: str
) -> str:
    """Build prompt for editing base reference to create secondary ref."""
    
    prompt_data = {
        "task": "edit_character_reference",
        "instruction": f"Edit this character reference image to show: {edit_description}",
        "character": {
            "name": char_name,
            "variation_type": ref_type,
            "variation_name": variation_name
        },
        "technical_requirements": {
            "format": "pixel_art",
            "keep_green_background": True,
            "maintain_character_identity": True,
            "only_change_requested_aspect": True,
            "palette": palette,
            "style": "16bit_retro_game_sprite"
        },
        "composition": {
            "keep_character_centered": True,
            "maintain_scale": True,
            "no_green_in_character": True,
            "clean_sprite_cutout": True
        },
        "critical_instructions": [
            "KEEP THE GREEN BACKGROUND UNCHANGED",
            "Maintain character identity and design",
            f"Only modify: {edit_description}",
            "Do NOT use green colors in the character",
            "Keep background solid green for chroma keying"
        ]
    }

    json_str = json.dumps(prompt_data, indent=2)

    return f"""Edit this character reference image:

{json_str}

CRITICAL: Keep the green background (#00FF00) unchanged. Only modify the character as described: {edit_description}"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID (e.g., forest-elf)")
    ap.add_argument("ref_type", help="Reference type (e.g., pose, expression, angle)")
    ap.add_argument("variation_name", help="Variation name (e.g., attack, happy, side)")
    ap.add_argument("edit_prompt", help="Description of what to change")
    ap.add_argument("--base-angle", default="front", help="Base angle to edit from (default: front)")
    ap.add_argument("--resolution", type=int, default=128, help="Output resolution (default: 128)")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    # Load character info from sprites.json
    sprites_file = project_root / "assets" / "sprites.json"
    if not sprites_file.exists():
        sprites_file = project_root / "sprites.json"

    sprites_data = []
    if sprites_file.exists():
        sprites_data = json.loads(sprites_file.read_text(encoding="utf-8"))

    char_info = None
    for sprite in sprites_data:
        if sprite.get("id") == args.char_id:
            char_info = sprite
            break

    if not char_info:
        print(f"Error: Character '{args.char_id}' not found in sprites.json", file=sys.stderr)
        return 1

    char_name = char_info.get("name", args.char_id)
    palette = char_info.get("palette", "16-bit retro pixel art")

    # Find base reference image (with green screen)
    base_ref_path = project_root / "assets" / "characters" / args.char_id / "ref" / f"{args.base_angle}.png"
    
    if not base_ref_path.exists():
        print(f"Error: Base reference not found: {base_ref_path}", file=sys.stderr)
        print(f"Make sure to generate angles first: python scripts/generate_character_angles.py {args.char_id} ...", file=sys.stderr)
        return 1

    # Output directory
    out_dir = project_root / "assets" / "characters" / args.char_id / args.ref_type
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{args.variation_name}.png"

    # Build edit prompt
    prompt = build_secondary_ref_prompt(
        char_name,
        args.ref_type,
        args.variation_name,
        args.edit_prompt,
        palette
    )

    print(f"Generating {args.ref_type}/{args.variation_name} for {char_name}...")
    print(f"  Base: {base_ref_path.name}")

    # Generate by editing base reference
    img_bytes, seed_used = generate_image_with_edit(
        prompt,
        base_ref_path,
        [],
        seed=args.seed,
        resolution=args.resolution
    )

    # Save output
    out_path.write_bytes(img_bytes)
    
    # Save prompt and seed
    prompt_path = out_path.with_suffix(".prompt.txt")
    prompt_path.write_text(prompt, encoding="utf-8")
    
    seed_path = out_path.with_suffix(".seed.txt")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    print(f"  wrote {out_path.relative_to(project_root)}  seed={seed_used}")

    # Update or create metadata file
    meta_path = out_dir / f"{args.ref_type}.json"
    meta = {}
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    
    meta[args.variation_name] = {
        "name": args.variation_name,
        "description": args.edit_prompt,
        "base_angle": args.base_angle,
        "file": f"{args.variation_name}.png",
        "seed": seed_used
    }
    
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"  updated {meta_path.relative_to(project_root)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
