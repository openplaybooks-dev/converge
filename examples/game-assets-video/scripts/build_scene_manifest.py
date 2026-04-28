#!/usr/bin/env python3
"""build_scene_manifest.py — Write per-scene scene.json + update REGISTRY scenes_using[].

For one scene, walk what's on disk under `assets/scenes/{scene_id}/` and
emit `assets/scenes/{scene_id}/scene.json` collecting:
  - concept image + spec paths
  - background layer atlases (one per layer)
  - tilemap atlas (if generated)
  - scene props (their atlases)
  - characters referenced (from scenes.json — REGISTRY entries)
  - shared props referenced (from scenes.json — REGISTRY entries)

Then append this scene's id to `scenes_using[]` of every REGISTRY entry
referenced by the scene.

Usage:
  python scripts/build_scene_manifest.py <scene_id>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib.sprite import find_project_root


def load_scenes(project_root: Path) -> list[dict]:
    p = project_root / "assets" / "scenes.json"
    if not p.exists():
        raise SystemExit(f"{p} not found")
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scenes = load_scenes(project_root)
    scene = next((s for s in scenes if s.get("id") == args.scene_id), None)
    if scene is None:
        raise SystemExit(f"scene '{args.scene_id}' not found in scenes.json")

    scene_dir = project_root / "assets" / "scenes" / args.scene_id

    # Concept + spec
    concept = scene_dir / "concept.png"
    spec = scene_dir / "SPEC.md"

    # Background layers
    background_layers = []
    for layer in scene.get("background", {}).get("layers", []):
        atlas_path = scene_dir / f"bg-{layer}.atlas.json"
        png_path = scene_dir / f"bg-{layer}.png"
        if atlas_path.exists() and png_path.exists():
            atlas = json.loads(atlas_path.read_text(encoding="utf-8"))
            meta = atlas.get("meta", {})
            background_layers.append({
                "layer": layer,
                "path": str(png_path.relative_to(project_root)),
                "atlas": str(atlas_path.relative_to(project_root)),
                "width": meta.get("frame_size", {}).get("w"),
                "height": meta.get("frame_size", {}).get("h"),
            })

    # Tilemap (within scene_dir)
    tilemap_atlas = None
    tilemap_dir = scene_dir / "tilesheet"
    if tilemap_dir.exists():
        atlas_path = tilemap_dir / "tilesheet.atlas.json"
        if atlas_path.exists():
            tilemap_atlas = str(atlas_path.relative_to(project_root))

    # Scene props
    scene_props = []
    sp_dir = scene_dir / "props"
    if sp_dir.exists():
        for prop_dir in sorted(sp_dir.iterdir()):
            if not prop_dir.is_dir():
                continue
            sheets_dir = prop_dir / "spritesheets"
            if not sheets_dir.exists():
                continue
            atlas_paths = []
            for state_dir in sorted(sheets_dir.iterdir()):
                if not state_dir.is_dir():
                    continue
                ap_p = state_dir / f"{state_dir.name}.atlas.json"
                if ap_p.exists():
                    atlas_paths.append(str(ap_p.relative_to(project_root)))
            if atlas_paths:
                scene_props.append({
                    "id": prop_dir.name,
                    "atlas_paths": atlas_paths,
                })

    # Characters / shared props referenced — IDs only; their atlases live
    # in the registry. The scene manifest carries the list; the master
    # atlas resolves paths.
    chars_ref = list(scene.get("characters", []))
    shared_ref = list(scene.get("shared_props", []))

    manifest = {
        "id": args.scene_id,
        "name": scene.get("name", args.scene_id),
        "biome": scene.get("biome", ""),
        "concept": str(concept.relative_to(project_root)) if concept.exists() else None,
        "spec": str(spec.relative_to(project_root)) if spec.exists() else None,
        "background": {"layers": background_layers},
        "tilemap": tilemap_atlas,
        "characters": chars_ref,
        "shared_props": shared_ref,
        "scene_props": scene_props,
    }
    out_path = scene_dir / "scene.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    sys.stderr.write(f"  wrote {out_path.relative_to(project_root)}\n")

    # Update REGISTRY scenes_using[]
    registry_path = project_root / "assets" / "REGISTRY.json"
    if registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        changed = False
        for entry in registry.get("characters", []):
            if entry["id"] in chars_ref and args.scene_id not in entry.get("scenes_using", []):
                entry.setdefault("scenes_using", []).append(args.scene_id)
                changed = True
        for entry in registry.get("shared_props", []):
            if entry["id"] in shared_ref and args.scene_id not in entry.get("scenes_using", []):
                entry.setdefault("scenes_using", []).append(args.scene_id)
                changed = True
        if changed:
            registry_path.write_text(json.dumps(registry, indent=2), encoding="utf-8")
            sys.stderr.write(f"  updated REGISTRY.json scenes_using[] for {args.scene_id}\n")

    # Refresh the master atlas so assets/atlas.json (and the Godot/Unity
    # exports) always reflect on-disk scene state. Without this hook the
    # atlas drifts stale every time a scene is added/regenerated, and the
    # gallery + per-scene viewer show empty `categories.scenes`.
    try:
        import build_master_atlas  # type: ignore
        build_master_atlas.main()
    except SystemExit as exc:
        if exc.code not in (0, None):
            sys.stderr.write(f"  ⚠ master-atlas refresh exited {exc.code}\n")
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"  ⚠ master-atlas refresh failed: {exc}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
