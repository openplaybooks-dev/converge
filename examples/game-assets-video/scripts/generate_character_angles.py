#!/usr/bin/env python3
"""
generate_character_angles.py — Generate the canonical-angle reference for a character.

Produces two artifacts: a high-resolution `source.png` (the original Gemini
output) and a downsized `canonical.png` (the working reference used by every
downstream variant and sprite-sheet task). Each artifact lives in its own
folder with a sibling prompt + seed/derived-from file for debugging.

Reads everything except char_id from `assets/sprites.json` so converge's
shell-WBS executor can invoke this with a single arg.

Usage:
  python scripts/generate_character_angles.py <char_id> [--seed N]

Outputs:
  assets/characters/{char_id}/ref/source/source.png            # source_resolution
  assets/characters/{char_id}/ref/source/source.prompt.txt
  assets/characters/{char_id}/ref/source/source.seed.txt
  assets/characters/{char_id}/ref/canonical/canonical.png      # working_resolution
  assets/characters/{char_id}/ref/canonical/derived-from.txt
  assets/characters/{char_id}/ref/manifest.json
"""

from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

from PIL import Image

from lib import budget
from lib.image_api import generate_image_with_edit, VIEWPORT_CONTRACT, active_backend
from lib.sprite import find_project_root


# Canonical angles. Only the ones referenced from sprites.json's
# canonical_angle field are ever generated; the rest exist so we can
# expand later without changing the script.
STANDARD_ANGLES: dict[str, dict] = {
    "front":      {"name": "Front View",      "description": "Character facing directly toward camera",        "rotation_y": 0,    "rotation_x": 0},
    "front_left": {"name": "Front-Left 45°",  "description": "Character facing 45 degrees left from front",    "rotation_y": -45,  "rotation_x": 0},
    "side_left":  {"name": "Left Side View",  "description": "Character facing left, side profile",            "rotation_y": -90,  "rotation_x": 0},
    "back_left":  {"name": "Back-Left 45°",   "description": "Character facing 45 degrees left from back",     "rotation_y": -135, "rotation_x": 0},
    "back":       {"name": "Back View",       "description": "Character facing away from camera",              "rotation_y": 180,  "rotation_x": 0},
    "front_right":{"name": "Front-Right 45°", "description": "Character facing 45 degrees right from front",   "rotation_y": 45,   "rotation_x": 0},
    "side_right": {"name": "Right Side View", "description": "Character facing right, side profile",           "rotation_y": 90,   "rotation_x": 0},
    "back_right": {"name": "Back-Right 45°",  "description": "Character facing 45 degrees right from back",    "rotation_y": 135,  "rotation_x": 0},
}


def build_angle_prompt(
    char_name: str,
    char_description: str,
    char_palette: str,
    char_palette_constraints: str,
    angle_key: str,
    angle_info: dict,
    art_style: str | None = None,
) -> str:
    """Top-level natural-language directives first, structured JSON below.

    Background is pure chroma green (#00FF00) — kept as-is for the video
    pipeline so the canonical reference is a green-screen frame the video
    model can extend. The frame-extraction step chroma-keys the green to
    alpha at the end, so the final spritesheet still has a clean transparent
    background.
    """
    from lib.art_styles import get_preset
    preset = get_preset(art_style)

    prompt_data = {
        "task": "generate_character_at_angle",
        "instruction": "Draw a single game character sprite, full-body, at the requested viewing angle, on a pure chroma-green (#00FF00) background",
        "character": {"name": char_name, "description": char_description},
        "viewing_angle": {
            "angle_name": angle_info["name"],
            "description": angle_info["description"],
            "rotation_y": angle_info["rotation_y"],
            "rotation_x": angle_info["rotation_x"],
        },
        "art_style": preset["style_name"],
        "art_style_description": preset["style_description"],
        "palette": char_palette or preset["palette_guidance"],
        "palette_constraints": char_palette_constraints,
        "composition": {
            "pose": "standing_neutral_idle",
            "view_angle": angle_info["description"],
            "framing": "full_body_centered_in_frame",
            "character_centered": True,
            "consistent_character_design": True,
        },
        "background": "PURE CHROMA GREEN #00FF00 — flat, uniform, no gradients, no shadows, no environment. Will be chroma-keyed to alpha downstream.",
        "critical_instructions": [
            f"Show character from {angle_info['name']} angle",
            f"Rotation: Y={angle_info['rotation_y']}°, X={angle_info['rotation_x']}°",
            "Character must be recognizable from this angle",
            "Maintain consistent character design",
            "Background is PURE FLAT CHROMA GREEN (#00FF00) across the entire canvas. Every non-character pixel is exactly #00FF00 — no gradients, no shadows, no ground plane, no environment, no texture. The character does NOT contain any pure green; if the palette includes greens, shift them slightly toward yellow-green or blue-green so the chroma key can isolate the background cleanly.",
            *preset.get("negative_directives", []),
        ],
    }

    json_str = json.dumps(prompt_data, indent=2)

    return f"""Draw a single game character on a pure chroma-green (#00FF00) background.

ART STYLE (mandatory): {preset["style_description"]}

Character: {char_name} — {char_description}
View: {angle_info['name']} — character body rotated to rotation_y={angle_info['rotation_y']}°, rotation_x={angle_info['rotation_x']}° (no tilt). Standing neutral idle pose.

{VIEWPORT_CONTRACT}
Palette discipline:
{char_palette_constraints or preset['palette_guidance']}

Background is PURE FLAT CHROMA GREEN (#00FF00) across the entire canvas. Every non-character pixel is exactly #00FF00 — no gradients, no shadows, no ground plane, no sky, no environment, no texture. The character itself must NOT contain any pure-green areas; if the palette calls for greens, shift them toward yellow-green or blue-green so the chroma key downstream can isolate the background cleanly. The character's pixels are fully opaque; the green pixels will be keyed to alpha by the next stage of the pipeline.

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


def pick_green_template(project_root: Path, source_resolution: int) -> Path:
    """Pick the closest available green template for the source resolution.
    Larger templates give Gemini more canvas to work with, so prefer the
    biggest <= source_resolution; fall back to the largest available."""
    available = sorted(
        (int(p.stem.split("_")[1].split("x")[0]), p)
        for p in (project_root / ".templates").glob("green_*.png")
    )
    if not available:
        raise SystemExit(f"No green templates in {project_root / '.templates'}")
    for size, path in reversed(available):
        if size <= source_resolution:
            return path
    return available[-1][1]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID (e.g., hero-knight) — must exist in assets/sprites.json")
    ap.add_argument("--seed", type=int, default=None, help="Random seed (default: random)")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    char = load_character(project_root, args.char_id)

    char_name = char["name"]
    char_description = char.get("description", f"Character: {char_name}")
    char_palette = char.get("palette", "")  # empty → preset's palette_guidance fills in
    char_palette_constraints = char.get("palette_constraints", "")
    art_style = char.get("art_style")  # None → project default preset
    # Default to side_right so the character faces right (toward the level).
    # Phaser's setFlipX(movingX < 0) idiom assumes the texture's natural
    # facing direction is right; left-facing canonicals end up displayed
    # backwards when standing or moving right.
    canonical_angle = char.get("canonical_angle", "side_right")
    source_resolution = int(char.get("source_resolution", 512))
    working_resolution = int(char.get("working_resolution", 128))

    if canonical_angle not in STANDARD_ANGLES:
        raise SystemExit(
            f"Unknown canonical_angle '{canonical_angle}' for {args.char_id}. "
            f"Known: {sorted(STANDARD_ANGLES.keys())}"
        )

    angle_info = STANDARD_ANGLES[canonical_angle]
    template_path = pick_green_template(project_root, source_resolution)

    # Output layout: each artifact is its own folder.
    char_root = project_root / "assets" / "characters" / args.char_id
    source_dir = char_root / "ref" / "source"
    canonical_dir = char_root / "ref" / "canonical"
    source_dir.mkdir(parents=True, exist_ok=True)
    canonical_dir.mkdir(parents=True, exist_ok=True)

    # Build the prompt and call Gemini once, at source_resolution.
    prompt = build_angle_prompt(
        char_name, char_description, char_palette, char_palette_constraints,
        canonical_angle, angle_info, art_style=art_style,
    )

    backend = active_backend()
    cost = budget.cost_for_image(backend)

    print(f"[{args.char_id}] generating {canonical_angle} reference at {source_resolution}x{source_resolution} (template={template_path.name}) backend={backend} cost={cost}¢", file=sys.stderr)
    with budget.charged(project_root, cost, f"image-{backend}",
                        note=f"{args.char_id}/canonical-{canonical_angle}"):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            template_path,
            [],
            seed=args.seed,
            resolution=source_resolution,
        )

    # Write source artifact (PNG + prompt + seed).
    source_png = source_dir / "source.png"
    source_png.write_bytes(img_bytes)
    (source_dir / "source.prompt.txt").write_text(prompt, encoding="utf-8")
    (source_dir / "source.seed.txt").write_text(str(seed_used), encoding="utf-8")
    print(f"  wrote {source_png.relative_to(project_root)} (seed={seed_used})", file=sys.stderr)

    # Derive canonical (downsized) from source. Pure local operation, no API.
    src_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    canonical_img = src_img.resize((working_resolution, working_resolution), Image.LANCZOS)
    canonical_png = canonical_dir / "canonical.png"
    canonical_buf = io.BytesIO()
    canonical_img.save(canonical_buf, format="PNG")
    canonical_png.write_bytes(canonical_buf.getvalue())
    (canonical_dir / "derived-from.txt").write_text(
        f"derived from: ../source/source.png\n"
        f"resize: {source_resolution}x{source_resolution} -> {working_resolution}x{working_resolution} (LANCZOS)\n"
        f"source seed: {seed_used}\n",
        encoding="utf-8",
    )
    print(f"  wrote {canonical_png.relative_to(project_root)} (downsized {source_resolution}->{working_resolution})", file=sys.stderr)

    # Manifest captures the locked viewport everything else inherits.
    manifest = {
        "char_id": args.char_id,
        "char_name": char_name,
        "canonical_angle": canonical_angle,
        "rotation_y": angle_info["rotation_y"],
        "rotation_x": angle_info["rotation_x"],
        "source_resolution": source_resolution,
        "working_resolution": working_resolution,
        "source_seed": seed_used,
    }
    manifest_path = char_root / "ref" / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"  wrote {manifest_path.relative_to(project_root)}", file=sys.stderr)

    # The converge runner treats wbs.type=shell as a task seeder and parses
    # stdout as JSON. We do the work directly and have no children to spawn —
    # emitting nothing on stdout makes the runner log "no tasks to spawn" and
    # continue (emitting "[]" trips the "spawned 0 tasks → repair" path).
    return 0


if __name__ == "__main__":
    sys.exit(main())
