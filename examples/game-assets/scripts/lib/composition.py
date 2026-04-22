"""
Shared helpers for composition.json handling.

Used by:
  - validate_composition.py
  - compose_preview.py
  - compose_blend.py
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


PROJECT_ROOT_MARKER = "shots.json"
"""We locate the project root by walking up until we find shots.json."""

SCHEMA_REL_PATH = ".converge/playbooks/default/schemas/composition.schema.json"


# ---------------------------------------------------------------------------
# Project-root resolution


def find_project_root(start: Path | None = None) -> Path:
    """Walk up from `start` (default: cwd) until a directory containing
    `shots.json` is found. Raise if none found by filesystem root."""
    cur = (start or Path.cwd()).resolve()
    while True:
        if (cur / PROJECT_ROOT_MARKER).exists():
            return cur
        if cur.parent == cur:
            raise FileNotFoundError(
                f"could not locate project root (no {PROJECT_ROOT_MARKER} found "
                f"walking up from {start or Path.cwd()})"
            )
        cur = cur.parent


# ---------------------------------------------------------------------------
# Loading


@dataclass
class Element:
    id: str
    type: str
    ref: Path           # absolute path on disk
    ref_rel: str        # as-written in composition.json
    x: float
    y: float
    width: float
    height: float
    rotation_deg: float = 0.0
    flip_horizontal: bool = False
    flip_vertical: bool = False
    opacity: float = 1.0
    z_order: int = 0
    pose_hint: str = ""
    notes: str = ""

    @classmethod
    def from_dict(cls, d: dict[str, Any], project_root: Path) -> "Element":
        return cls(
            id=d["id"],
            type=d["type"],
            ref=(project_root / d["ref"]).resolve(),
            ref_rel=d["ref"],
            x=float(d["x"]),
            y=float(d["y"]),
            width=float(d["width"]),
            height=float(d["height"]),
            rotation_deg=float(d.get("rotation_deg", 0.0)),
            flip_horizontal=bool(d.get("flip_horizontal", False)),
            flip_vertical=bool(d.get("flip_vertical", False)),
            opacity=float(d.get("opacity", 1.0)),
            z_order=int(d.get("z_order", 0)),
            pose_hint=d.get("pose_hint", ""),
            notes=d.get("notes", ""),
        )

    def bbox_px(self, canvas_w: int, canvas_h: int) -> tuple[int, int, int, int]:
        """Return (x0, y0, x1, y1) in canvas pixels."""
        x0 = int(round(self.x * canvas_w))
        y0 = int(round(self.y * canvas_h))
        x1 = int(round((self.x + self.width) * canvas_w))
        y1 = int(round((self.y + self.height) * canvas_h))
        return x0, y0, x1, y1


@dataclass
class Composition:
    path: Path
    project_root: Path
    raw: dict[str, Any]

    shot_id: str
    frame: str                # "start" | "end"
    canvas_w: int
    canvas_h: int
    aspect_ratio: str
    base_ref: Path
    base_ref_rel: str
    base_fit: str
    elements: list[Element] = field(default_factory=list)
    lighting: dict[str, Any] = field(default_factory=dict)
    motion_intent: dict[str, Any] | None = None
    blend_prompt: str = ""
    negative_prompt: str = ""

    @classmethod
    def load(cls, path: Path, project_root: Path | None = None) -> "Composition":
        path = Path(path).resolve()
        root = project_root or find_project_root(path.parent)
        raw = json.loads(path.read_text(encoding="utf-8"))

        canvas = raw["canvas"]
        base = raw["base"]
        elements = [Element.from_dict(e, root) for e in raw.get("elements", [])]
        elements.sort(key=lambda e: e.z_order)

        return cls(
            path=path,
            project_root=root,
            raw=raw,
            shot_id=raw["shot_id"],
            frame=raw["frame"],
            canvas_w=int(canvas["width"]),
            canvas_h=int(canvas["height"]),
            aspect_ratio=canvas.get("aspect_ratio", ""),
            base_ref=(root / base["ref"]).resolve(),
            base_ref_rel=base["ref"],
            base_fit=base.get("fit", "cover"),
            elements=elements,
            lighting=raw.get("lighting", {}),
            motion_intent=raw.get("motion_intent"),
            blend_prompt=raw.get("blend_prompt", ""),
            negative_prompt=raw.get("negative_prompt", ""),
        )


# ---------------------------------------------------------------------------
# Schema


def load_schema(project_root: Path) -> dict[str, Any]:
    schema_path = project_root / SCHEMA_REL_PATH
    return json.loads(schema_path.read_text(encoding="utf-8"))
