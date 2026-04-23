#!/usr/bin/env python3
"""
composition_meta.py — Track composition lineage for generated game assets.

Each generated PNG gets a sidecar <filename>.compose.json tracking:
- Which composition/art style was used
- Base reference (prior generation step)
- Parent composition file
- Prompt, seed, model used
- Input assets and their roles

Pipeline: ref → pose → state → atlas → spritesheet
Each step writes compose.json to enable lineage tracing.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional


@dataclass
class ArtStyle:
    source: str  # path to art-style.md or global config
    palette: str  # palette description


@dataclass
class BaseRef:
    path: str  # relative path to parent asset
    prompt_used: Optional[str] = None


@dataclass
class InputAsset:
    role: str  # "reference", "pose_source", "frame_source", "spritesheet"
    path: str  # relative path
    type: str = "image"  # "image" | "json"


@dataclass
class CompositionMeta:
    version: int = 1
    asset_type: str = ""  # "ref" | "pose" | "frame" | "spritesheet" | "atlas"
    asset_id: str = ""
    role: str = ""  # "front" | "idle" | "walk" | "idle_00" | "spritesheet"
    output_path: str = ""
    base_ref: Optional[BaseRef] = None
    art_style: Optional[ArtStyle] = None
    pose_hint: Optional[str] = None
    prompt: str = ""
    seed: Optional[int] = None
    model: str = "gemini-3.1-flash-image-preview"
    resolution: tuple[int, int] = (128, 128)
    inputs: list[InputAsset] = field(default_factory=list)
    parent: Optional[str] = None  # path to parent's compose.json

    def to_dict(self) -> dict:
        d = asdict(self)
        d["resolution"] = list(self.resolution)
        return d

    @staticmethod
    def from_dict(d: dict) -> CompositionMeta:
        d = dict(d)
        if "resolution" in d and isinstance(d["resolution"], list):
            d["resolution"] = tuple(d["resolution"])
        if "base_ref" in d and d["base_ref"] is not None:
            d["base_ref"] = BaseRef(**d["base_ref"])
        if "art_style" in d and d["art_style"] is not None:
            d["art_style"] = ArtStyle(**d["art_style"])
        if "inputs" in d:
            d["inputs"] = [InputAsset(**x) for x in d["inputs"]]
        return CompositionMeta(**d)


def compose_json_path(asset_path: Path) -> Path:
    """Return path for compose.json sidecar of an asset."""
    return asset_path.with_suffix(asset_path.suffix + ".compose.json")


def write_compose_json(asset_path: Path, meta: CompositionMeta) -> None:
    """Write composition metadata as sidecar JSON."""
    out_path = compose_json_path(asset_path)
    out_path.write_text(json.dumps(meta.to_dict(), indent=2), encoding="utf-8")


def read_compose_json(asset_path: Path) -> Optional[CompositionMeta]:
    """Read composition metadata from sidecar JSON, or None if not found."""
    path = compose_json_path(asset_path)
    if not path.exists():
        return None
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
        return CompositionMeta.from_dict(d)
    except (json.JSONDecodeError, TypeError):
        return None


def load_art_style(project_root: Path) -> ArtStyle:
    """Load art style from global config."""
    style_path = project_root / "assets" / "global" / "art-style.md"
    palette = ""
    if style_path.exists():
        palette = style_path.read_text(encoding="utf-8").strip()
    return ArtStyle(source="assets/global/art-style.md", palette=palette)


def load_sprites_json(project_root: Path) -> list[dict]:
    """Load sprites.json manifest."""
    path = project_root / "sprites.json"
    if not path.exists():
        return []
    import json as _json
    return _json.loads(path.read_text(encoding="utf-8"))