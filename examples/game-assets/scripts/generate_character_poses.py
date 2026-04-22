#!/usr/bin/env python3
"""
generate_character_poses.py — Generate character pose reference images at specific angles.

Usage:
  python scripts/generate_character_poses.py <char_id> <char_name> <char_palette>

Outputs:
  assets/characters/{char_id}/poses/{angle}.png
  assets/characters/{char_id}/poses/{angle}.prompt.txt
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from lib.image_api import generate_image
from lib.sprite import find_project_root


ANGLES = [
    ("front", "Front-facing view, neutral standing pose"),
    ("side", "Side-facing view (character facing right), walking pose"),
    ("back", "Back-facing view, showing cape or back details"),
    ("3q-left", "Three-quarter left view"),
    ("3q-right", "Three-quarter right view"),
]


from PIL import Image
import io


def build_prompt(char_name: str, angle: str, angle_desc: str, char_palette: str) -> str:
    lines = []
    lines.append(f"SINGLE CHARACTER POSE IMAGE: {char_name} - {angle}")
    lines.append(f"")
    lines.append(f"Angle: {angle_desc}")
    lines.append(f"Character: {char_name}")
    lines.append(f"")
    lines.append(f"OUTPUT: ONE single {angle} pose image at 128x128 pixels.")
    lines.append(f"Pixel art style, {char_palette}")
    lines.append(f"No text, labels, or watermarks.")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID (e.g., hero-knight)")
    ap.add_argument("char_name", help="Character name (e.g., Sir Aldric)")
    ap.add_argument("char_palette", help="Art style/palette description")
    ap.add_argument("--angles", nargs="+", choices=[a for a, _ in ANGLES], help="Which angles to generate")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    poses_dir = project_root / "assets" / "characters" / args.char_id / "poses"
    poses_dir.mkdir(parents=True, exist_ok=True)

    angles_to_generate = [a for a, d in ANGLES if a in (args.angles or [a for a, _ in ANGLES])]

    for angle, desc in ANGLES:
        if angle not in angles_to_generate:
            continue

        out_path = poses_dir / f"{angle}.png"
        if out_path.exists():
            print(f"  skip {angle} (already exists)")
            continue

        prompt = build_prompt(args.char_name, angle, desc, args.char_palette)
        prompt_path = out_path.with_suffix(".prompt.txt")
        prompt_path.write_text(prompt, encoding="utf-8")

        print(f"Generating {angle} pose for {args.char_name}...")
        img_bytes, seed = generate_image(prompt, [], seed=None)

        # Post-process: strip light background to transparent
        img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
        pixels = img.load()
        stripped = 0
        w, h = img.width, img.height
        for y in range(h):
            for x in range(w):
                p = pixels[x, y]
                r, g, b, a = p[0], p[1], p[2], p[3]
                max_val = max(r, g, b)
                if max_val < 120:
                    continue
                min_val = min(r, g, b)
                sat = (max_val - min_val) / (max_val + 1e-10)
                # Strip background: bright (>120) and low saturation (<0.35)
                if max_val > 120 and sat < 0.35:
                    pixels[x, y] = (0, 0, 0, 0)
                    stripped += 1

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        img_bytes = buf.getvalue()

        out_path.write_bytes(img_bytes)
        print(f"  wrote {out_path.relative_to(project_root)} seed={seed}, stripped={stripped}")

    print(f"\nGenerated poses in {poses_dir.relative_to(project_root)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())