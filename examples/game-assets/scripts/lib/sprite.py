"""
Shared helpers for sprite sheet operations.

Used by:
  - build-sprite-sheet.py
  - slice-sprites.py
  - export_metadata.py
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


PROJECT_ROOT_MARKER = f"assets{__import__('os').sep}sprites.json"


# ---------------------------------------------------------------------------
# Project-root resolution


def find_project_root(start: Path | None = None) -> Path:
    """Walk up from `start` (default: cwd) until a directory containing
    `sprites.json` is found. Raise if none found by filesystem root."""
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
# Sprite sheet builder


@dataclass
class SpriteSheet:
    """Represents a sprite sheet grid and provides build/slice operations."""
    sheet: Any = field(default=None)
    frame_count: int = 4
    sprite_resolution: int = 128
    sprites_per_row: int = 4

    @property
    def sheet_size(self) -> tuple[int, int]:
        rows = (self.frame_count + self.sprites_per_row - 1) // self.sprites_per_row
        w = self.sprites_per_row * self.sprite_resolution
        h = rows * self.sprite_resolution
        return w, h

    @staticmethod
    def build(
        frames_dir: Path,
        output_path: Path,
        *,
        frame_count: int = 4,
        sprite_resolution: int = 128,
        sprites_per_row: int = 4,
    ) -> "SpriteSheet":
        """Assemble frame PNGs from frames_dir into a sprite sheet grid."""
        rows = (frame_count + sprites_per_row - 1) // sprites_per_row
        w = sprites_per_row * sprite_resolution
        h = rows * sprite_resolution

        try:
            from PIL import Image
        except ImportError as exc:
            raise SystemExit("Pillow not installed. Run: pip install Pillow") from exc

        sheet = Image.new("RGBA", (w, h), (0, 0, 0, 0))

        for i in range(frame_count):
            frame_path = frames_dir / f"frame_{i:03d}.png"
            if frame_path.exists():
                frame = Image.open(frame_path).convert("RGBA")
                frame = frame.resize((sprite_resolution, sprite_resolution), Image.LANCZOS)
                row = i // sprites_per_row
                col = i % sprites_per_row
                x = col * sprite_resolution
                y = row * sprite_resolution
                sheet.paste(frame, (x, y))

        output_path.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(output_path, "PNG", optimize=True)
        return SpriteSheet(sheet, frame_count, sprite_resolution, sprites_per_row)

    @staticmethod
    def slice(
        sprite_sheet: Path,
        output_dir: Path,
        *,
        sprite_resolution: int = 128,
        sprites_per_row: int = 4,
        prefix: str = "frame",
        json_path: Path | None = None,
    ) -> list[dict]:
        """Slice a sprite sheet into individual frame PNGs. Returns frame coords list."""
        try:
            from PIL import Image
        except ImportError as exc:
            raise SystemExit("Pillow not installed. Run: pip install Pillow") from exc

        sheet = Image.open(sprite_sheet)
        frames = []
        rows = sheet.height // sprite_resolution
        total = rows * sprites_per_row

        output_dir.mkdir(parents=True, exist_ok=True)

        for i in range(total):
            row = i // sprites_per_row
            col = i % sprites_per_row
            x = col * sprite_resolution
            y = row * sprite_resolution
            frame_img = sheet.crop((x, y, x + sprite_resolution, y + sprite_resolution))
            frame_path = output_dir / f"{prefix}_{i:03d}.png"
            frame_img.save(frame_path, "PNG", optimize=True)
            frames.append({
                "filename": frame_path.name,
                "frame": {"x": x, "y": y, "w": sprite_resolution, "h": sprite_resolution},
            })

        if json_path:
            json_path.parent.mkdir(parents=True, exist_ok=True)
            json_path.write_text(json.dumps({"frames": frames}, indent=2), encoding="utf-8")

        return frames


# ---------------------------------------------------------------------------
# Atlas exporter


@dataclass
class AtlasExporter:
    """Export sprite atlas metadata in engine-specific formats."""
    asset_dir: Path
    category: str  # "characters" | "objects" | "backgrounds" | "tile_maps"
    sprite_resolution: int = 128
    sprites_per_row: int = 4
    animation_states: list[str] | None = None

    def export(self, engines: list[str] | None = None) -> None:
        """Write atlas JSON + engine-specific formats to asset_dir."""
        engines = engines or ["raw", "godot", "unity"]
        self.asset_dir.mkdir(parents=True, exist_ok=True)

        sprites_dir = self.asset_dir / "sprites"
        if not sprites_dir.exists():
            sprites_dir.mkdir(parents=True, exist_ok=True)

        frames_data = []
        for state in (self.animation_states or []):
            frames_path = sprites_dir / f"{state}.frames.json"
            if frames_path.exists():
                frames_data.extend(json.loads(frames_path.read_text(encoding="utf-8"))["frames"])

        atlas = {
            "frames": frames_data,
            "meta": {
                "sprite_resolution": self.sprite_resolution,
                "animation_states": self.animation_states or [],
            }
        }

        if "raw" in engines:
            (self.asset_dir / "atlas.json").write_text(
                json.dumps(atlas, indent=2), encoding="utf-8")

        if "godot" in engines:
            godot_atlas = self._to_godot_format(atlas)
            (self.asset_dir / "atlas.godot.json").write_text(
                json.dumps(godot_atlas, indent=2), encoding="utf-8")

        if "unity" in engines:
            unity_atlas = self._to_unity_format(atlas)
            (self.asset_dir / "atlas.unity.json").write_text(
                json.dumps(unity_atlas, indent=2), encoding="utf-8")

    def _to_godot_format(self, atlas: dict) -> dict:
        animations = []
        for state in (self.animation_states or []):
            state_frames = [f for f in atlas["frames"]
                           if f["filename"].startswith(state)]
            animations.append({
                "name": state,
                "frames": [{"name": f["filename"].replace(".png", ""),
                           "texture": f"res://{self.asset_dir.name}/sprites/{f['filename']}"}
                           for f in state_frames],
                "loop": True,
            })
        return {"frames": [], "animations": animations}

    def _to_unity_format(self, atlas: dict) -> dict:
        return {
            "sprites": [{
                "name": f["filename"].replace(".png", ""),
                "rect": f["frame"],
                "pivot": {"x": 0.5, "y": 0.5},
            } for f in atlas["frames"]],
            "meta": {"spriteResolution": self.sprite_resolution, "format": "SpriteAtlas"},
        }
