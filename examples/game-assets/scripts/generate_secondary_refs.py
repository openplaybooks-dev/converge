#!/usr/bin/env python3
"""
generate_secondary_refs.py — Generate a pose variant by editing the canonical reference.

Loads `assets/characters/{char_id}/ref/canonical/canonical.png` (produced by
generate_character_angles.py) and edits it to show a different body pose
while preserving viewport, framing, scale, and identity. Each variant lives
in its own folder with a sibling prompt + seed for debugging.

Reads char_name / palette / palette_constraints / canonical_angle /
working_resolution from `assets/sprites.json`.

Usage:
  python scripts/generate_secondary_refs.py <char_id> <pose_name> [edit_prompt] [--seed N] [--ref-type pose]

Examples:
  python scripts/generate_secondary_refs.py forest-elf attack "drawing bow, arrow nocked, leaning forward"
  python scripts/generate_secondary_refs.py hero-knight defend "shield raised in front, sword arm cocked back"

If edit_prompt is omitted, a generic description ("{pose_name} pose") is
used — fine for quick iteration but vague results.

Outputs:
  assets/characters/{char_id}/variants/{pose_name}/{pose_name}.png
  assets/characters/{char_id}/variants/{pose_name}/{pose_name}.prompt.txt
  assets/characters/{char_id}/variants/{pose_name}/{pose_name}.seed.txt
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib.image_api import generate_image_with_edit, VIEWPORT_CONTRACT
from lib.sprite import find_project_root


def build_variant_prompt(
    char_name: str,
    ref_type: str,
    variation_name: str,
    edit_description: str,
    palette: str,
    palette_constraints: str,
    base_angle: str,
    art_style: str | None = None,
) -> str:
    from lib.art_styles import get_preset
    preset = get_preset(art_style)

    prompt_data = {
        "task": "edit_character_reference",
        "instruction": f"Edit this character reference image to show: {edit_description}",
        "character": {
            "name": char_name,
            "variation_type": ref_type,
            "variation_name": variation_name,
        },
        "viewing_angle": {
            "angle_name": base_angle,
            "must_match_base_image": True,
        },
        "art_style": preset["style_name"],
        "art_style_description": preset["style_description"],
        "palette": palette or preset["palette_guidance"],
        "palette_constraints": palette_constraints,
        "composition": {
            "keep_character_centered": True,
            "maintain_scale": True,
            "consistent_character_design": True,
        },
        "background": "TRANSPARENT (alpha=0) — preserve the alpha channel from the base reference",
        "critical_instructions": [
            "Maintain character identity and design",
            f"Only modify: {edit_description}",
            "Background is FULLY TRANSPARENT — every non-character pixel must have alpha = 0. Do NOT paint any background color.",
            *preset.get("negative_directives", []),
        ],
    }

    json_str = json.dumps(prompt_data, indent=2)

    return f"""Edit this character reference to create a pose variation, on a fully transparent canvas.

ART STYLE (mandatory): {preset["style_description"]}

Character: {char_name}
Pose change: {edit_description}

The viewing angle, camera, framing, and character scale MUST stay identical to the base image. The base image is the {base_angle} reference; the output must be the same character at the same {base_angle} angle, just in a different pose. Do not rotate, do not zoom, do not re-frame — only the character's body pose changes.

{VIEWPORT_CONTRACT}
Palette discipline:
{palette_constraints or preset['palette_guidance']}

Background is FULLY TRANSPARENT. Do NOT paint a background color. The PNG output must have a real alpha channel where every non-character pixel has alpha = 0.

Structured spec for reference:

{json_str}
"""


def load_character(project_root: Path, char_id: str) -> dict:
    sprites_file = project_root / "assets" / "sprites.json"
    sprites_data = json.loads(sprites_file.read_text(encoding="utf-8"))
    for sprite in sprites_data:
        if sprite.get("id") == char_id:
            return sprite
    raise SystemExit(f"Character '{char_id}' not found in {sprites_file}")


def ensure_variant_ref(
    project_root: Path,
    char_id: str,
    pose_name: str,
    edit_description: str | None = None,
    *,
    ref_type: str = "pose",
    seed: int | None = None,
) -> Path:
    """Return the path to a pose variant ref, generating it if missing.

    Idempotent: if `variants/{pose_name}/{pose_name}.png` already exists,
    no API call happens. Used by generate_spritesheet.py to lazily create
    only the variants a state actually needs.
    """
    out_dir = project_root / "assets" / "characters" / char_id / "variants" / pose_name
    out_path = out_dir / f"{pose_name}.png"
    if out_path.exists():
        return out_path

    char = load_character(project_root, char_id)
    char_name = char["name"]
    palette = char.get("palette", "")
    palette_constraints = char.get("palette_constraints", "")
    canonical_angle = char.get("canonical_angle", "side_right")
    art_style = char.get("art_style")
    working_resolution = int(char.get("working_resolution", 128))

    base_ref_path = project_root / "assets" / "characters" / char_id / "ref" / "canonical" / "canonical.png"
    if not base_ref_path.exists():
        raise SystemExit(
            f"Canonical reference not found: {base_ref_path}\n"
            f"Run first: python scripts/generate_character_angles.py {char_id}"
        )

    description = edit_description or f"{pose_name} pose"
    out_dir.mkdir(parents=True, exist_ok=True)
    prompt = build_variant_prompt(
        char_name, ref_type, pose_name, description,
        palette, palette_constraints, canonical_angle,
        art_style=art_style,
    )

    print(f"[{char_id}] generating variant '{pose_name}' at {working_resolution}x{working_resolution} (base={base_ref_path.relative_to(project_root)})", file=sys.stderr)
    img_bytes, seed_used = generate_image_with_edit(
        prompt,
        base_ref_path,
        [],
        seed=seed,
        resolution=working_resolution,
    )

    out_path.write_bytes(img_bytes)
    (out_dir / f"{pose_name}.prompt.txt").write_text(prompt, encoding="utf-8")
    (out_dir / f"{pose_name}.seed.txt").write_text(str(seed_used), encoding="utf-8")
    print(f"  wrote {out_path.relative_to(project_root)} (seed={seed_used})", file=sys.stderr)
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID (must exist in assets/sprites.json)")
    ap.add_argument("pose_name", help="Variant name (e.g., attack, defend, jump, crouch)")
    ap.add_argument("edit_prompt", nargs="?", default=None,
                    help="Plain-language description of the pose change. If omitted, a generic '{pose_name} pose' is used.")
    ap.add_argument("--ref-type", default="pose",
                    help="Variant category for the prompt JSON (default: pose). Use 'expression' for face changes.")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    ensure_variant_ref(
        project_root,
        args.char_id,
        args.pose_name,
        args.edit_prompt,
        ref_type=args.ref_type,
        seed=args.seed,
    )
    # Leaf, not a seeder: emit nothing on stdout (see generate_character_angles
    # for why "[]" is the wrong choice).
    return 0


if __name__ == "__main__":
    sys.exit(main())
