#!/usr/bin/env python3
"""
generate_asset_breakdown.py — Generate comprehensive breakdown of all assets to be generated.

Analyzes asset definitions and creates a complete inventory of outputs.

Usage:
  python scripts/generate_asset_breakdown.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from lib.sprite import find_project_root


def main() -> int:
    project_root = find_project_root(Path.cwd())

    # Load sprites.json
    sprites_file = project_root / "assets" / "sprites.json"
    if not sprites_file.exists():
        print(f"Error: {sprites_file} not found", file=sys.stderr)
        return 1

    sprites_data = json.loads(sprites_file.read_text(encoding="utf-8"))

    if not sprites_data:
        print("Error: sprites.json is empty", file=sys.stderr)
        return 1

    # Standard pose variations
    POSE_VARIATIONS = ["attack", "defend", "jump"]
    
    # Standard angles
    ANGLES = ["front", "side_left", "side_right", "back"]

    # Build breakdown
    breakdown = {
        "summary": {
            "total_characters": len(sprites_data),
            "total_angle_refs": 0,
            "total_pose_refs": 0,
            "total_sprite_sheets": 0,
            "total_frames": 0,
            "estimated_time_minutes": 0
        },
        "characters": []
    }

    for sprite in sprites_data:
        char_id = sprite["id"]
        char_name = sprite["name"]
        animation_states = sprite.get("animation_states", ["idle", "walk"])

        # Calculate outputs
        angle_refs = [f"{angle}.png" for angle in ANGLES]
        pose_refs = [f"{pose}.png" for pose in POSE_VARIATIONS]
        
        states = {}
        total_frames = 0
        for state in animation_states:
            frames = 4  # Default frame count
            states[state] = {
                "frames": frames,
                "sheet": f"assets/characters/{char_id}/states/{state}/{state}.png",
                "atlas": f"assets/characters/{char_id}/states/{state}/atlas.json"
            }
            total_frames += frames

        char_breakdown = {
            "id": char_id,
            "name": char_name,
            "description": sprite.get("description", ""),
            "palette": sprite.get("palette", ""),
            "outputs": {
                "spec": f"assets/characters/{char_id}/SPEC.md",
                "angles": angle_refs,
                "poses": pose_refs,
                "states": states
            },
            "counts": {
                "angle_refs": len(ANGLES),
                "pose_refs": len(POSE_VARIATIONS),
                "sprite_sheets": len(animation_states),
                "total_frames": total_frames
            }
        }

        breakdown["characters"].append(char_breakdown)

        # Update summary
        breakdown["summary"]["total_angle_refs"] += len(ANGLES)
        breakdown["summary"]["total_pose_refs"] += len(POSE_VARIATIONS)
        breakdown["summary"]["total_sprite_sheets"] += len(animation_states)
        breakdown["summary"]["total_frames"] += total_frames

    # Estimate time (rough approximation)
    # Angles: ~30s each, Poses: ~30s each, Frames: ~20s each
    total_images = (
        breakdown["summary"]["total_angle_refs"] +
        breakdown["summary"]["total_pose_refs"] +
        breakdown["summary"]["total_frames"]
    )
    estimated_seconds = total_images * 25  # Average 25s per image
    breakdown["summary"]["estimated_time_minutes"] = round(estimated_seconds / 60)

    # Write breakdown
    output_path = project_root / ".converge" / "asset-breakdown.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(breakdown, indent=2), encoding="utf-8")

    print(f"Asset Breakdown Generated")
    print(f"=" * 60)
    print(f"Total Characters:     {breakdown['summary']['total_characters']}")
    print(f"Total Angle Refs:     {breakdown['summary']['total_angle_refs']}")
    print(f"Total Pose Refs:      {breakdown['summary']['total_pose_refs']}")
    print(f"Total Sprite Sheets:  {breakdown['summary']['total_sprite_sheets']}")
    print(f"Total Frames:         {breakdown['summary']['total_frames']}")
    print(f"Estimated Time:       ~{breakdown['summary']['estimated_time_minutes']} minutes")
    print(f"=" * 60)
    print(f"\nDetailed breakdown saved to: {output_path.relative_to(project_root)}")
    print(f"\nPer-Character Breakdown:")
    for char in breakdown["characters"]:
        print(f"\n  {char['name']} ({char['id']}):")
        print(f"    - {char['counts']['angle_refs']} angle references")
        print(f"    - {char['counts']['pose_refs']} pose variations")
        print(f"    - {char['counts']['sprite_sheets']} sprite sheets")
        print(f"    - {char['counts']['total_frames']} total frames")

    return 0


if __name__ == "__main__":
    sys.exit(main())
