#!/usr/bin/env python3
"""
generate_character_angles.py — Generate character reference images from multiple angles.

This creates a reference set with different viewing angles (front, side, back, etc.)
and poses that will be used as locked references for all downstream sprite generation.

Usage:
  python scripts/generate_character_angles.py <char_id> <char_name> <char_description> <char_palette>

Outputs:
  assets/characters/{char_id}/ref/front.png
  assets/characters/{char_id}/ref/side.png
  assets/characters/{char_id}/ref/back.png
  assets/characters/{char_id}/ref/angles.json  # Angle metadata
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib.image_api import generate_image_with_edit
from lib.sprite import find_project_root


# Standard game sprite angles
STANDARD_ANGLES = {
    "front": {
        "name": "Front View",
        "description": "Character facing directly toward camera",
        "rotation_y": 0,
        "rotation_x": 0
    },
    "front_left": {
        "name": "Front-Left 45°",
        "description": "Character facing 45 degrees left from front",
        "rotation_y": -45,
        "rotation_x": 0
    },
    "side_left": {
        "name": "Left Side View",
        "description": "Character facing left, side profile",
        "rotation_y": -90,
        "rotation_x": 0
    },
    "back_left": {
        "name": "Back-Left 45°",
        "description": "Character facing 45 degrees left from back",
        "rotation_y": -135,
        "rotation_x": 0
    },
    "back": {
        "name": "Back View",
        "description": "Character facing away from camera",
        "rotation_y": 180,
        "rotation_x": 0
    },
    "front_right": {
        "name": "Front-Right 45°",
        "description": "Character facing 45 degrees right from front",
        "rotation_y": 45,
        "rotation_x": 0
    },
    "side_right": {
        "name": "Right Side View",
        "description": "Character facing right, side profile",
        "rotation_y": 90,
        "rotation_x": 0
    },
    "back_right": {
        "name": "Back-Right 45°",
        "description": "Character facing 45 degrees right from back",
        "rotation_y": 135,
        "rotation_x": 0
    }
}


def build_angle_prompt(
    char_name: str,
    char_description: str,
    char_palette: str,
    angle_key: str,
    angle_info: dict
) -> str:
    """Build JSON prompt for generating character at specific angle."""
    
    prompt_data = {
        "task": "edit_image_add_character_at_angle",
        "instruction": f"Add a game character sprite to this green background at a specific viewing angle",
        "character": {
            "name": char_name,
            "description": char_description
        },
        "viewing_angle": {
            "angle_name": angle_info["name"],
            "description": angle_info["description"],
            "rotation_y": angle_info["rotation_y"],
            "rotation_x": angle_info["rotation_x"]
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
            "view_angle": angle_info["description"],
            "framing": "full_body_centered_in_frame",
            "character_centered": True,
            "no_green_in_character": True,
            "avoid_green_colors_in_sprite": True,
            "clean_sprite_cutout": True,
            "consistent_character_design": True
        },
        "critical_instructions": [
            "KEEP THE GREEN BACKGROUND UNCHANGED",
            f"Show character from {angle_info['name']} angle",
            f"Rotation: Y={angle_info['rotation_y']}°, X={angle_info['rotation_x']}°",
            "Character must be recognizable from this angle",
            "Maintain consistent character design across all angles",
            "Do NOT use green colors in the character"
        ]
    }

    json_str = json.dumps(prompt_data, indent=2)

    return f"""Edit this green background image by adding a character sprite at a specific angle:

{json_str}

CRITICAL: Keep the green background (#00FF00) unchanged. Show the character from {angle_info['name']} (Y rotation: {angle_info['rotation_y']}°). The character must be recognizable and consistent with other angles."""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID (e.g., hero-knight)")
    ap.add_argument("char_name", help="Character name (e.g., Sir Aldric)")
    ap.add_argument("char_description", help="Character description")
    ap.add_argument("char_palette", help="Art style/palette description")
    ap.add_argument("--angles", nargs="+", default=["front", "side_left", "side_right", "back"],
                    help="Angles to generate (default: front side_left side_right back)")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    # Setup output directory - angles go in ref/angles subdirectory
    ref_dir = project_root / "assets" / "characters" / args.char_id / "ref"
    angles_dir = ref_dir / "angles"
    angles_dir.mkdir(parents=True, exist_ok=True)

    # Get green template
    template_path = project_root / ".templates" / "green_128x128.png"
    if not template_path.exists():
        print(f"Error: Green template not found at {template_path}", file=sys.stderr)
        print("Run: python scripts/create_green_template.py", file=sys.stderr)
        return 1

    # Generate each angle
    angles_metadata = {}
    
    print(f"Generating {len(args.angles)} angle(s) for {args.char_name}...")
    
    for angle_key in args.angles:
        if angle_key not in STANDARD_ANGLES:
            print(f"Warning: Unknown angle '{angle_key}', skipping", file=sys.stderr)
            continue

        angle_info = STANDARD_ANGLES[angle_key]
        print(f"  - {angle_key}: {angle_info['name']}")

        # Build prompt
        prompt = build_angle_prompt(
            args.char_name,
            args.char_description,
            args.char_palette,
            angle_key,
            angle_info
        )

        # Generate image
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            template_path,
            [],
            seed=args.seed,
            resolution=128
        )

        # Save image to angles subdirectory
        out_path = angles_dir / f"{angle_key}.png"
        out_path.write_bytes(img_bytes)

        # Save prompt
        prompt_path = angles_dir / f"{angle_key}.prompt.txt"
        prompt_path.write_text(prompt, encoding="utf-8")

        # Save seed
        seed_path = angles_dir / f"{angle_key}.seed.txt"
        seed_path.write_text(str(seed_used), encoding="utf-8")

        # Store metadata
        angles_metadata[angle_key] = {
            "name": angle_info["name"],
            "description": angle_info["description"],
            "rotation_y": angle_info["rotation_y"],
            "rotation_x": angle_info["rotation_x"],
            "file": f"{angle_key}.png",
            "seed": seed_used
        }

        print(f"    wrote {angle_key}.png  seed={seed_used}")

    # Save angles metadata to angles subdirectory
    angles_json_path = angles_dir / "angles.json"
    angles_json_path.write_text(json.dumps(angles_metadata, indent=2), encoding="utf-8")

    # Save character spec
    spec_path = ref_dir.parent / "SPEC.md"
    spec_path.write_text(
        f"# {args.char_name}\n\n"
        f"**ID:** {args.char_id}\n"
        f"**Palette:** {args.char_palette}\n\n"
        f"## Description\n\n{args.char_description}\n\n"
        f"## Reference Angles\n\n"
        + "\n".join([f"- **{info['name']}** (Y: {info['rotation_y']}°): `{info['file']}`" 
                     for info in angles_metadata.values()]),
        encoding="utf-8"
    )

    print(f"\nGenerated {len(angles_metadata)} angle reference(s) for {args.char_name}")
    print(f"Metadata saved to: {angles_json_path.relative_to(project_root)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
