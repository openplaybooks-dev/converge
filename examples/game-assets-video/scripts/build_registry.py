#!/usr/bin/env python3
"""build_registry.py — Auto-derive assets/REGISTRY.json from on-disk shared assets.

Walks `assets/characters/` and `assets/objects-shared/` (with fallback to
legacy `assets/objects/`) and emits a structured registry that scenes
reference for asset reuse:

  {
    "characters": [
      {
        "id": "hero-knight",
        "type": "character",
        "ref_canonical": "assets/characters/hero-knight/ref/canonical/canonical.png",
        "states": ["idle", "walk"],
        "atlas_paths": [...],
        "scenes_using": []
      }
    ],
    "shared_props": [
      {
        "id": "health-potion",
        "type": "shared_prop",
        "ref_image": "assets/objects-shared/health-potion/spritesheets/idle/idle.png",
        "states": ["idle", "collect"],
        "atlas_paths": [...],
        "scenes_using": []
      }
    ]
  }

`scenes_using` is filled in later by `build_scene_manifest.py` as scenes
reference shared assets. Re-running this script repopulates from disk and
preserves any scenes_using markings that still reference an existing scene.

Usage:
  python scripts/build_registry.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from lib.sprite import find_project_root


def discover_characters(project_root: Path) -> list[dict]:
    """Each character has a canonical ref + spritesheets/{state}/ directories."""
    chars_dir = project_root / "assets" / "characters"
    if not chars_dir.exists():
        return []
    out = []
    for char_dir in sorted(chars_dir.iterdir()):
        if not char_dir.is_dir():
            continue
        canonical = char_dir / "ref" / "canonical" / "canonical.png"
        sheets_dir = char_dir / "spritesheets"
        if not sheets_dir.exists():
            continue
        states = []
        atlas_paths = []
        for state_dir in sorted(sheets_dir.iterdir()):
            if not state_dir.is_dir():
                continue
            atlas_path = state_dir / f"{state_dir.name}.atlas.json"
            if not atlas_path.exists():
                continue
            states.append(state_dir.name)
            atlas_paths.append(str(atlas_path.relative_to(project_root)))
        if not states:
            continue
        entry = {
            "id": char_dir.name,
            "type": "character",
            "states": states,
            "atlas_paths": atlas_paths,
            "scenes_using": [],
        }
        if canonical.exists():
            entry["ref_canonical"] = str(canonical.relative_to(project_root))
        out.append(entry)
    return out


def discover_shared_props(project_root: Path) -> list[dict]:
    """Shared props live under `objects-shared/` (preferred) or legacy
    `objects/`. Each has spritesheets/{state}/ directories."""
    candidates = [
        project_root / "assets" / "objects-shared",
        project_root / "assets" / "objects",
    ]
    root = next((c for c in candidates if c.exists()), None)
    if root is None:
        return []
    out = []
    for prop_dir in sorted(root.iterdir()):
        if not prop_dir.is_dir():
            continue
        sheets_dir = prop_dir / "spritesheets"
        if not sheets_dir.exists():
            continue
        states = []
        atlas_paths = []
        for state_dir in sorted(sheets_dir.iterdir()):
            if not state_dir.is_dir():
                continue
            atlas_path = state_dir / f"{state_dir.name}.atlas.json"
            if not atlas_path.exists():
                continue
            states.append(state_dir.name)
            atlas_paths.append(str(atlas_path.relative_to(project_root)))
        if not states:
            continue
        entry = {
            "id": prop_dir.name,
            "type": "shared_prop",
            "states": states,
            "atlas_paths": atlas_paths,
            "scenes_using": [],
        }
        # Use the first state's PNG as a generic ref image
        first_state_png = sheets_dir / states[0] / f"{states[0]}.png"
        if first_state_png.exists():
            entry["ref_image"] = str(first_state_png.relative_to(project_root))
        out.append(entry)
    return out


def merge_scenes_using(new_entries: list[dict], existing: list[dict]) -> list[dict]:
    """Preserve scenes_using[] from any existing entry whose id matches."""
    by_id = {e["id"]: e for e in existing}
    for entry in new_entries:
        prev = by_id.get(entry["id"])
        if prev:
            entry["scenes_using"] = prev.get("scenes_using", [])
    return new_entries


def main() -> int:
    project_root = find_project_root(Path.cwd())
    registry_path = project_root / "assets" / "REGISTRY.json"

    existing = {"characters": [], "shared_props": []}
    if registry_path.exists():
        try:
            existing = json.loads(registry_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    characters = merge_scenes_using(
        discover_characters(project_root),
        existing.get("characters", []),
    )
    shared_props = merge_scenes_using(
        discover_shared_props(project_root),
        existing.get("shared_props", []),
    )

    registry = {
        "characters": characters,
        "shared_props": shared_props,
    }
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    registry_path.write_text(json.dumps(registry, indent=2), encoding="utf-8")

    print(
        f"[registry] wrote {registry_path.relative_to(project_root)} — "
        f"{len(characters)} character(s), {len(shared_props)} shared prop(s)",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
