"""Attach the project-wide style-sheet anchor to every paid image-gen call.

The style-sheet is one PNG produced once by 01b-style-sheet
(scripts/generate_style_sheet.py). It shows the project's target
rendering style on representative subjects (props, tiles, palette).
Every downstream prop/tile/bg generator prepends it as the first
reference image so the model has a single visual source of truth.

This is the fix for cross-asset style clash: today each generator passes
only text-style hints, so two parallel calls produce two different
renderings. Prepending the same image to both calls locks them.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterable


def style_sheet_path(project_root: Path) -> Path:
    """Path to the project's universal style-sheet anchor PNG.

    Lives inside a per-asset folder (`assets/concept/style-sheet/`)
    alongside its `prompt.txt` and `seed.txt` sidecars.
    """
    return project_root / "assets" / "concept" / "style-sheet" / "image.png"


def hero_shot_path(project_root: Path) -> Path:
    """Path to the project's secondary style anchor (concept hero shot)."""
    return project_root / "assets" / "concept" / "hero-shot" / "image.png"


def landscape_path(project_root: Path, biome: str) -> Path:
    """Path to a biome's landscape concept PNG."""
    return project_root / "assets" / "concept" / f"landscape-{biome}" / "image.png"


def scene_concept_path(project_root: Path, scene_id: str) -> Path:
    return project_root / "assets" / "scenes" / scene_id / "concept.png"


def attach_style_anchor(
    extra_refs: Iterable[Path] | None,
    project_root: Path,
    scene_id: str | None = None,
) -> list[Path]:
    """Return a new list with the style-sheet (and scene concept if given)
    prepended to existing refs.

    Order: [style-sheet, scene-concept, *caller_refs]. The first reference
    is treated by image-gen models as the dominant style cue, so the
    project anchor wins, then the per-scene context, then anything the
    caller wanted to add (e.g. the layer-below for parallax).

    Caller refs already containing the anchor paths are de-duplicated.

    If the anchor PNG is missing, prints a warning and returns refs
    without it. The playbook-level check `style-sheet-exists` is
    expected to gate this at the task-graph level.
    """
    refs: list[Path] = []

    sheet = style_sheet_path(project_root)
    if sheet.exists():
        refs.append(sheet)
    else:
        print(
            f"  warning: style-sheet anchor missing at {sheet} — "
            f"run 01b-style-sheet to produce it",
            file=sys.stderr,
        )

    if scene_id:
        concept = scene_concept_path(project_root, scene_id)
        if concept.exists():
            refs.append(concept)

    seen = {p.resolve() for p in refs}
    for p in extra_refs or []:
        rp = Path(p).resolve()
        if rp not in seen:
            refs.append(Path(p))
            seen.add(rp)

    return refs
