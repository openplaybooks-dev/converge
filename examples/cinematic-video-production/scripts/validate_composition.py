#!/usr/bin/env python3
"""
validate_composition.py — schema + semantic checks for a composition.json.

Exits 0 on pass, 1 on first violation.

Usage:
  python scripts/validate_composition.py <path-to-composition.json> [<path2> ...]
  python scripts/validate_composition.py --all          # every composition in compositions/**
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from jsonschema import Draft7Validator

# allow running as `python scripts/validate_composition.py`
sys.path.insert(0, str(Path(__file__).parent))
from lib.composition import Composition, find_project_root, load_schema  # noqa: E402


def collect_compositions(root: Path) -> list[Path]:
    return sorted((root / "compositions").glob("*/*.json"))


def validate_one(path: Path, project_root: Path, schema: dict) -> list[str]:
    """Return a list of error strings (empty = pass)."""
    errors: list[str] = []

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"invalid JSON: {exc}"]

    # 1. schema
    v = Draft7Validator(schema)
    for err in sorted(v.iter_errors(raw), key=lambda e: e.path):
        loc = "/".join(str(p) for p in err.absolute_path) or "(root)"
        errors.append(f"schema @ {loc}: {err.message}")

    if errors:
        return errors

    # 2. semantic: load, check refs, check bounds
    comp = Composition.load(path, project_root)

    if not comp.base_ref.exists():
        errors.append(f"base.ref missing on disk: {comp.base_ref_rel}")

    seen_ids: set[str] = set()
    seen_z: set[int] = set()
    for el in comp.elements:
        if el.id in seen_ids:
            errors.append(f"duplicate element id: {el.id}")
        seen_ids.add(el.id)

        if el.z_order in seen_z:
            errors.append(
                f"duplicate z_order {el.z_order} (element {el.id}) — "
                "z-order must be unique per frame so stacking is deterministic"
            )
        seen_z.add(el.z_order)

        if not el.ref.exists():
            errors.append(f"element '{el.id}' ref missing on disk: {el.ref_rel}")

        # warn but don't fail on off-canvas (intentional for bleed / close-ups)
        x1 = el.x + el.width
        y1 = el.y + el.height
        if x1 < 0 or y1 < 0 or el.x > 1 or el.y > 1:
            errors.append(
                f"element '{el.id}' entirely off-canvas "
                f"(x={el.x}, y={el.y}, w={el.width}, h={el.height}) — bail"
            )

    # 3. frame semantics
    if comp.frame == "end" and not (comp.motion_intent and comp.motion_intent.get("summary")):
        errors.append(
            "end-frame composition has no motion_intent.summary — "
            "the blender needs to know what changed since the start frame"
        )

    if comp.frame == "start" and comp.motion_intent:
        errors.append("start-frame composition has motion_intent (only valid on end frame)")

    return errors


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("paths", nargs="*", help="composition.json file(s)")
    ap.add_argument("--all", action="store_true", help="validate every composition in compositions/")
    args = ap.parse_args()

    project_root = find_project_root()
    schema = load_schema(project_root)

    if args.all:
        targets = collect_compositions(project_root)
        if not targets:
            print(f"no compositions found under {project_root}/compositions/")
            return 0
    else:
        if not args.paths:
            ap.error("pass path(s) or --all")
        targets = [Path(p).resolve() for p in args.paths]

    any_failed = False
    for p in targets:
        errs = validate_one(p, project_root, schema)
        rel = p.relative_to(project_root) if p.is_relative_to(project_root) else p
        if errs:
            any_failed = True
            print(f"FAIL {rel}")
            for e in errs:
                print(f"  - {e}")
        else:
            print(f"OK   {rel}")

    return 1 if any_failed else 0


if __name__ == "__main__":
    sys.exit(main())
