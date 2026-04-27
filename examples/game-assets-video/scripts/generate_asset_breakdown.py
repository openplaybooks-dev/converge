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


def _load_optional_manifest(path: Path) -> list:
    """Load a JSON manifest if present; return [] if missing or empty."""
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data or []


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

    # Optional category manifests (introduced when the playbook expanded
    # beyond characters). Missing files are treated as empty lists so old
    # projects keep working.
    objects_data = _load_optional_manifest(project_root / "assets" / "objects.json")
    tile_maps_data = _load_optional_manifest(project_root / "assets" / "tile_maps.json")
    backgrounds_data = _load_optional_manifest(project_root / "assets" / "backgrounds.json")

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
            "total_props": len(objects_data),
            "total_prop_states": 0,
            "total_tilemaps": len(tile_maps_data),
            "total_tile_variants": 0,
            "total_backgrounds": len(backgrounds_data),
            "estimated_time_minutes": 0
        },
        "characters": [],
        "props": [],
        "tile_maps": [],
        "backgrounds": []
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

    # Props (objects.json) — each state is one 4x4 spritesheet (16 frames per state).
    for obj in objects_data:
        obj_id = obj["id"]
        states = obj.get("states", ["idle"])
        prop_breakdown = {
            "id": obj_id,
            "name": obj.get("name", obj_id),
            "category": obj.get("category", obj.get("type", "item")),
            "states": {
                state: {
                    "frames": 16,
                    "sheet": f"assets/objects/{obj_id}/spritesheets/{state}/{state}.png",
                    "atlas": f"assets/objects/{obj_id}/spritesheets/{state}/{state}.atlas.json",
                }
                for state in states
            },
            "counts": {
                "spritesheets": len(states),
                "total_frames": 16 * len(states),
            },
        }
        breakdown["props"].append(prop_breakdown)
        breakdown["summary"]["total_prop_states"] += len(states)
        breakdown["summary"]["total_frames"] += 16 * len(states)

    # Tile maps — one image-gen per tile_variant, then one composite.
    for tm in tile_maps_data:
        tm_id = tm["id"]
        variants = tm.get("tile_variants") or [
            {"id": layer.replace(" ", "-"), "layer": layer, "description": layer}
            for layer in tm.get("layers", [])
        ]
        tm_breakdown = {
            "id": tm_id,
            "name": tm.get("name", tm_id),
            "tile_dimensions": tm.get("tile_dimensions", [16, 16]),
            "sheet_grid": tm.get("sheet_grid", [4, 4]),
            "variant_count": len(variants),
            "tilesheet": f"assets/tile_maps/{tm_id}/tilesheet/tilesheet.png",
            "atlas": f"assets/tile_maps/{tm_id}/tilesheet/tilesheet.atlas.json",
        }
        breakdown["tile_maps"].append(tm_breakdown)
        breakdown["summary"]["total_tile_variants"] += len(variants)

    # Backgrounds — one image-gen per parallax-layer entry.
    for bg in backgrounds_data:
        bg_id = bg["id"]
        breakdown["backgrounds"].append({
            "id": bg_id,
            "name": bg.get("name", bg_id),
            "parallax_layer": bg.get("parallax_layer", "mid"),
            "resolution": bg.get("resolution", [1920, 1080]),
            "sheet": f"assets/backgrounds/{bg_id}/{bg_id}.png",
            "atlas": f"assets/backgrounds/{bg_id}/{bg_id}.atlas.json",
        })

    # Estimate time (rough approximation)
    # Angles: ~30s each, Poses: ~30s each, Frames: ~20s each, Tiles: ~20s, Backgrounds: ~40s
    total_images = (
        breakdown["summary"]["total_angle_refs"] +
        breakdown["summary"]["total_pose_refs"] +
        breakdown["summary"]["total_frames"] +
        breakdown["summary"]["total_tile_variants"] +
        breakdown["summary"]["total_backgrounds"]
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
    print(f"Total Props:          {breakdown['summary']['total_props']} ({breakdown['summary']['total_prop_states']} states)")
    print(f"Total Tilemaps:       {breakdown['summary']['total_tilemaps']} ({breakdown['summary']['total_tile_variants']} tile variants)")
    print(f"Total Backgrounds:    {breakdown['summary']['total_backgrounds']}")
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
    if breakdown["props"]:
        print(f"\nPer-Prop Breakdown:")
        for prop in breakdown["props"]:
            print(f"  {prop['name']} ({prop['id']}, {prop['category']}): {prop['counts']['spritesheets']} sheets, {prop['counts']['total_frames']} frames")
    if breakdown["tile_maps"]:
        print(f"\nPer-Tilemap Breakdown:")
        for tm in breakdown["tile_maps"]:
            print(f"  {tm['name']} ({tm['id']}): {tm['variant_count']} tile variants, sheet grid {tm['sheet_grid'][0]}x{tm['sheet_grid'][1]}")
    if breakdown["backgrounds"]:
        print(f"\nPer-Background Breakdown:")
        for bg in breakdown["backgrounds"]:
            print(f"  {bg['name']} ({bg['id']}, {bg['parallax_layer']}): {bg['resolution'][0]}x{bg['resolution'][1]}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
