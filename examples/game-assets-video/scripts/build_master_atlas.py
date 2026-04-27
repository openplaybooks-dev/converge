#!/usr/bin/env python3
"""
build_master_atlas.py — Aggregate every per-sheet *.atlas.json into engine-ready master atlases.

Walks assets/{characters,objects,tile_maps,backgrounds}/**/*.atlas.json,
aggregates into one master, and emits:

  assets/atlas.json         — raw aggregate, grouped by category
  assets/atlas.godot.json   — Godot SpriteFrames-style: one "animation" per
                              (category, asset_id, state) slice. Uses
                              lib/sprite.AtlasExporter._to_godot_format on
                              each slice.
  assets/atlas.unity.json   — Unity sprite atlas: flat sprites list with
                              rects + pivots. Uses
                              lib/sprite.AtlasExporter._to_unity_format on
                              the aggregate.

This bypasses AtlasExporter's broken .export() entry point (which expects a
sprites/{state}.frames.json layout that no other task produces) and feeds
its format-conversion methods directly with already-aggregated data.

Usage:
  python scripts/build_master_atlas.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Iterable

from lib.sprite import AtlasExporter, find_project_root


CATEGORIES = ("characters", "objects", "tile_maps", "backgrounds", "scenes")

# Cross-scene asset roots — scenes/ aggregation collects atlases from
# assets/scenes/ only, NOT from these (those are picked up by the four
# global categories above).
_SCENE_INTERNAL_DIRS = {"scenes"}


def discover_per_sheet_atlases(project_root: Path) -> dict[str, list[Path]]:
    """Return {category: [atlas_paths...]}.

    Master-atlas-aggregates-all-sheets relies on every per-sheet atlas
    written by the various generators / build_tilesheet.py being
    discoverable here — so any new asset type just needs to drop
    *.atlas.json next to its PNG and it gets aggregated for free.

    The `scenes` category walks assets/scenes/*/* — every per-scene
    bg layer, tilesheet, and scene-prop atlas — and tags each slice with
    the scene that owns it.
    """
    found: dict[str, list[Path]] = {c: [] for c in CATEGORIES}
    for category in CATEGORIES:
        if category in _SCENE_INTERNAL_DIRS:
            continue
        cat_dir = project_root / "assets" / category
        if not cat_dir.exists():
            continue
        # Sorted for stable ordering across runs.
        found[category] = sorted(cat_dir.rglob("*.atlas.json"))

    scenes_dir = project_root / "assets" / "scenes"
    if scenes_dir.exists():
        # Each scene's atlases live under assets/scenes/{scene_id}/...
        # We collect *.atlas.json under that tree but skip scene.json
        # itself (which is a manifest, not an atlas).
        found["scenes"] = sorted(scenes_dir.rglob("*.atlas.json"))
    return found


def read_atlas(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def slice_id_from_path(category: str, atlas_path: Path, project_root: Path) -> tuple[str, str]:
    """Derive (asset_id, state) from an atlas file path.

    - characters: assets/characters/{char_id}/spritesheets/{state}/{state}.atlas.json
    - objects:    assets/objects/{obj_id}/spritesheets/{state}/{state}.atlas.json
    - tile_maps:  assets/tile_maps/{tm_id}/tilesheet/tilesheet.atlas.json
    - backgrounds:assets/backgrounds/{bg_id}/{bg_id}.atlas.json
    - scenes:     assets/scenes/{scene_id}/{bg-<layer>|tilesheet/tilesheet|props/<prop_id>/spritesheets/<state>/<state>}.atlas.json

    Returns (asset_id, state). `scenes` slices encode the scene_id as the
    first segment of asset_id so the master atlas can group per-scene
    assets together (e.g. forest-1/bg-far, forest-1/tilesheet,
    forest-1/prop/torch).
    """
    rel = atlas_path.relative_to(project_root / "assets" / category)
    parts = rel.parts
    asset_id = parts[0]
    if category in ("characters", "objects") and len(parts) >= 3:
        # .../spritesheets/{state}/{state}.atlas.json
        state = parts[2] if parts[1] == "spritesheets" else ""
    elif category == "scenes":
        scene_id = parts[0]
        rest = parts[1:]
        # Discriminate: bg layer vs tilesheet vs scene-prop spritesheet.
        if len(rest) == 1 and rest[0].startswith("bg-") and rest[0].endswith(".atlas.json"):
            asset_id = f"{scene_id}/{rest[0][:-len('.atlas.json')]}"
            state = ""
        elif len(rest) >= 2 and rest[0] == "tilesheet":
            # tilesheet/tilesheet.atlas.json — exclude per-tile atlases (we
            # don't generate any but be defensive).
            if rest[-1] == "tilesheet.atlas.json":
                asset_id = f"{scene_id}/tilesheet"
                state = ""
            else:
                asset_id = f"{scene_id}/tilesheet/{rest[1]}"
                state = ""
        elif len(rest) >= 5 and rest[0] == "props" and rest[2] == "spritesheets":
            # props/{prop_id}/spritesheets/{state}/{state}.atlas.json
            asset_id = f"{scene_id}/prop/{rest[1]}"
            state = rest[3]
        else:
            asset_id = f"{scene_id}/" + "/".join(rest[:-1])
            state = ""
    else:
        state = ""
    return asset_id, state


def build_aggregate(found: dict[str, list[Path]], project_root: Path) -> dict:
    """Build the raw master atlas, grouped by category."""
    aggregate: dict = {
        "meta": {
            "categories": list(CATEGORIES),
            "sources": {c: len(found[c]) for c in CATEGORIES},
        },
        "categories": {},
    }

    for category, paths in found.items():
        slices = []
        for path in paths:
            atlas = read_atlas(path)
            meta = atlas.get("meta", {})
            mode = meta.get("mode", "sheet")
            asset_id, state = slice_id_from_path(category, path, project_root)
            slice_entry: dict = {
                "asset_id": asset_id,
                "state": state,
                "atlas_path": str(path.relative_to(project_root)).replace("\\", "/"),
                "mode": mode,
                "meta": meta,
                "frames": atlas.get("frames", []),
            }
            if mode == "frames":
                slice_entry["frames_dir"] = meta.get(
                    "frames_dir",
                    str(path.parent.relative_to(project_root)).replace("\\", "/"),
                )
            else:
                sheet_dir = path.parent.relative_to(project_root)
                sheet_image = atlas.get("image", path.with_suffix("").name + ".png")
                slice_entry["sheet_path"] = str(sheet_dir / sheet_image).replace("\\", "/")
            slices.append(slice_entry)
        aggregate["categories"][category] = slices

    return aggregate


def all_frames_with_paths(aggregate: dict) -> Iterable[dict]:
    """Flatten every slice's frames, prefixing filename with the asset/state
    so master-atlas frames are globally unique (different sheets can
    legitimately have a frame named "idle_000.png").

    Sheet-mode slices yield `{filename, frame, sheet, category}` where
    `frame` is a pixel rect inside the sheet PNG.

    Frames-mode slices yield `{filename, sheet, category}` where `sheet`
    points at the individual frame PNG and there is no `frame` rect — the
    file is the sprite.
    """
    for category, slices in aggregate["categories"].items():
        for sl in slices:
            if sl.get("mode") == "frames":
                for f in sl["frames"]:
                    yield {
                        "filename": f"{sl['asset_id']}/{sl['state'] or 'sheet'}/{f['filename']}",
                        "sheet": f["path"],
                        "category": category,
                    }
            else:
                sheet_path = sl["sheet_path"]
                for f in sl["frames"]:
                    yield {
                        "filename": f"{sl['asset_id']}/{sl['state'] or 'sheet'}/{f['filename']}",
                        "frame": f["frame"],
                        "sheet": sheet_path,
                        "category": category,
                    }


def build_godot(aggregate: dict, project_root: Path) -> dict:
    """One Godot SpriteFrames "animation" per (category, asset_id, state) slice.

    Uses AtlasExporter._to_godot_format on a synthetic slice atlas — its
    grouping logic ("frames whose filename startswith state name") matches
    the per-slice naming convention (idle_000.png, walk_000.png) used by
    generate_spritesheet.py and generate_prop_spritesheet.py.

    AtlasExporter builds Godot texture paths from `asset_dir.name + "/sprites/"`,
    which doesn't match our actual on-disk layout (we don't have per-sheet
    `sprites/` subdirs and frame PNGs aren't sliced out — they're rectangles
    inside the sheet PNG). We post-fix `texture` to point at the actual sheet
    PNG so Godot can load it as an AtlasTexture.
    """
    animations = []
    for category, slices in aggregate["categories"].items():
        for sl in slices:
            anim_name = f"{category}/{sl['asset_id']}/{sl['state'] or sl['asset_id']}"
            if sl.get("mode") == "frames":
                # Frames-mode: each frame is its own texture, no region.
                fixed_frames = [
                    {
                        "name": Path(f["filename"]).stem,
                        "texture": f"res://{f['path']}",
                    }
                    for f in sl["frames"]
                ]
                animations.append({
                    "name": anim_name,
                    "loop": bool(sl.get("meta", {}).get("yoyo", False)) is False,
                    "speed": sl.get("meta", {}).get("frameRate", 8),
                    "frames": fixed_frames,
                })
                continue

            # Sheet-mode (existing behavior): texture is the sheet PNG, each
            # frame is an AtlasTexture region inside it.
            sheet_path = sl["sheet_path"]  # already project-relative, posix
            slice_atlas = {"frames": sl["frames"]}
            exporter = AtlasExporter(
                asset_dir=project_root / sheet_path,
                category=category,
                animation_states=[sl["state"] or sl["asset_id"]],
            )
            godot_slice = exporter._to_godot_format(slice_atlas)
            frames_by_filename = {f["filename"]: f for f in sl["frames"]}
            for anim in godot_slice["animations"]:
                anim["name"] = f"{category}/{sl['asset_id']}/{anim['name']}"
                fixed_frames = []
                for fr in anim["frames"]:
                    src = frames_by_filename.get(fr["name"] + ".png", {})
                    fixed_frames.append({
                        "name": fr["name"],
                        "texture": f"res://{sheet_path}",
                        "region": src.get("frame", {}),
                    })
                anim["frames"] = fixed_frames
                animations.append(anim)
    return {"frames": [], "animations": animations}


def build_unity(aggregate: dict, project_root: Path) -> dict:
    """Flat Unity sprite list from every frame in the aggregate.

    Sheet-mode frames carry a pixel-rect inside their sheet PNG. Frames-mode
    frames are full PNGs on their own, so the sprite's rect is the file's
    full image bounds (read from PIL on demand) and `texture` points at the
    individual file rather than a packed sheet.
    """
    sprites = []
    for f in all_frames_with_paths(aggregate):
        name = f["filename"].replace(".png", "")
        if "frame" in f:
            sprites.append({
                "name": name,
                "texture": f["sheet"],
                "rect": f["frame"],
                "pivot": {"x": 0.5, "y": 0.5},
            })
        else:
            # Frames-mode: probe size lazily; cache results so 8 frames per
            # state isn't 8 PIL opens × every state.
            w, h = _probe_size(project_root / f["sheet"])
            sprites.append({
                "name": name,
                "texture": f["sheet"],
                "rect": {"x": 0, "y": 0, "w": w, "h": h},
                "pivot": {"x": 0.5, "y": 0.5},
            })
    return {
        "sprites": sprites,
        "meta": {"spriteResolution": 0, "format": "SpriteAtlas"},
    }


_size_cache: dict[str, tuple[int, int]] = {}


def _probe_size(path: Path) -> tuple[int, int]:
    key = str(path)
    if key not in _size_cache:
        from PIL import Image
        _size_cache[key] = Image.open(path).size
    return _size_cache[key]


def main() -> int:
    project_root = find_project_root(Path.cwd())
    found = discover_per_sheet_atlases(project_root)

    total = sum(len(v) for v in found.values())
    if total == 0:
        print("No per-sheet *.atlas.json files found — nothing to aggregate", file=sys.stderr)
        return 1

    print(
        f"Aggregating {total} per-sheet atlas(es): "
        + ", ".join(f"{c}={len(found[c])}" for c in CATEGORIES),
        file=sys.stderr,
    )

    aggregate = build_aggregate(found, project_root)
    godot = build_godot(aggregate, project_root)
    unity = build_unity(aggregate, project_root)

    out_dir = project_root / "assets"
    (out_dir / "atlas.json").write_text(json.dumps(aggregate, indent=2), encoding="utf-8")
    (out_dir / "atlas.godot.json").write_text(json.dumps(godot, indent=2), encoding="utf-8")
    (out_dir / "atlas.unity.json").write_text(json.dumps(unity, indent=2), encoding="utf-8")

    n_frames = sum(len(s["frames"]) for slices in aggregate["categories"].values() for s in slices)
    print(
        f"  wrote assets/atlas.json + atlas.godot.json + atlas.unity.json "
        f"({n_frames} frames across {sum(len(v) for v in found.values())} sheets)",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
