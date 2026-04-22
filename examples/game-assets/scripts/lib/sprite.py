"""
lib/sprite.py — Shared helpers for sprite sheet building, slicing, and atlas export.

Used by:
  - build-sprite-sheet.py
  - slice-sprites.py
  - export_metadata.py
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT_MARKER = "sprites.json"


# ---------------------------------------------------------------------------
# Project-root resolution


def find_project_root(start: Path | None = None) -> Path:
    """Walk up from `start` (default: cwd) until sprites.json is found."""
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
# SpriteSheet — build and slice


@dataclass
class SpriteSheet:
    """Describes a sprite sheet grid."""

    sheet_path: Path
    frame_count: int
    sprite_resolution: int
    sprites_per_row: int

    @property
    def cols(self) -> int:
        return self.sprites_per_row

    @property
    def rows(self) -> int:
        return (self.frame_count + self.sprites_per_row - 1) // self.sprites_per_row

    @property
    def sheet_size(self) -> tuple[int, int]:
        return (
            self.sprites_per_row * self.sprite_resolution,
            self.rows * self.sprite_resolution,
        )

    def frame_coords(self, index: int) -> tuple[int, int, int, int]:
        """Return (x, y, w, h) for frame at index."""
        col = index % self.sprites_per_row
        row = index // self.sprites_per_row
        x = col * self.sprite_resolution
        y = row * self.sprite_resolution
        return x, y, self.sprite_resolution, self.sprite_resolution

    @staticmethod
    def build(
        frames_dir: Path,
        output_path: Path,
        frame_count: int,
        sprite_resolution: int,
        sprites_per_row: int,
    ) -> "SpriteSheet":
        """Assemble frame PNGs into a sprite sheet."""
        sheet_w = sprites_per_row * sprite_resolution
        sheet_h = ((frame_count + sprites_per_row - 1) // sprites_per_row) * sprite_resolution

        sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

        for i in range(frame_count):
            frame_path = frames_dir / f"frame_{i:03d}.png"
            if frame_path.exists():
                frame = Image.open(frame_path)
                x, y, w, h = SpriteSheet._frame_rect(i, sprite_resolution, sprites_per_row)
                sheet.paste(frame.resize((w, h), Image.LANCZOS), (x, y))
            else:
                print(f"  warning: missing frame {i}: {frame_path}", file=sys.stderr)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(output_path, "PNG", optimize=True)

        return SpriteSheet(
            sheet_path=output_path,
            frame_count=frame_count,
            sprite_resolution=sprite_resolution,
            sprites_per_row=sprites_per_row,
        )

    @staticmethod
    def _frame_rect(index: int, resolution: int, per_row: int) -> tuple[int, int, int, int]:
        col = index % per_row
        row = index // per_row
        return (
            col * resolution,
            row * resolution,
            resolution,
            resolution,
        )

    @staticmethod
    def slice(
        sprite_sheet: Path,
        output_dir: Path,
        sprite_resolution: int,
        sprites_per_row: int,
        prefix: str = "frame",
    ) -> list[dict[str, Any]]:
        """Slice a sprite sheet into individual frames. Returns frame manifest."""
        img = Image.open(sprite_sheet)
        w, h = img.size

        frames_per_row = w // sprite_resolution
        total_rows = h // sprite_resolution
        total_frames = frames_per_row * total_rows

        output_dir.mkdir(parents=True, exist_ok=True)
        manifest = []

        for i in range(total_frames):
            col = i % frames_per_row
            row = i // frames_per_row

            x = col * sprite_resolution
            y = row * sprite_resolution

            frame = img.crop((x, y, x + sprite_resolution, y + sprite_resolution))

            filename = f"{prefix}_{i:03d}.png"
            out_path = output_dir / filename
            frame.save(out_path, "PNG", optimize=True)

            manifest.append({
                "filename": filename,
                "frame": {"x": x, "y": y, "w": sprite_resolution, "h": sprite_resolution},
                "index": i,
            })

        return manifest


# ---------------------------------------------------------------------------
# AtlasExporter — generate atlas JSON for different engines


@dataclass
class AtlasExporter:
    asset_dir: Path
    category: str

    def export(self, engines: list[str]) -> None:
        """Export atlas.json + engine-specific formats."""
        # Load sprites dir
        sprites_dir = self.asset_dir / "sprites"
        if not sprites_dir.exists():
            sprites_dir = self.asset_dir

        frame_files = sorted(sprites_dir.glob("*.png"))
        if not frame_files:
            print(f"  warning: no sprite frames found in {sprites_dir}", file=sys.stderr)
            return

        # Build frames list (assume uniform resolution from first frame)
        first = Image.open(frame_files[0])
        resolution = max(first.size[0], first.size[1])

        frames = []
        for f in frame_files:
            # Parse filename: state_index.png
            name = f.stem
            frames.append({
                "filename": f.name,
                "frame": {"x": 0, "y": 0, "w": resolution, "h": resolution},
                "duration": 100,
            })

        meta = {
            "sprite_resolution": resolution,
            "category": self.category,
        }

        base = {"frames": frames, "meta": meta}

        # Raw atlas.json
        if "raw" in engines:
            (self.asset_dir / "atlas.json").write_text(
                json.dumps(base, indent=2), encoding="utf-8"
            )

        # Godot format
        if "godot" in engines:
            godot = {
                "frames": [{"name": fr["filename"], "texture": f"res://{self.asset_dir.name}/sprites/{fr['filename']}"} for fr in frames],
                "animations": [
                    {"name": "default", "frames": [fr["filename"] for fr in frames], "loop": True}
                ],
            }
            (self.asset_dir / "atlas.godot.json").write_text(
                json.dumps(godot, indent=2), encoding="utf-8"
            )

        # Unity format
        if "unity" in engines:
            unity = {
                "sprites": [
                    {"name": fr["filename"], "rect": fr["frame"], "pivot": {"x": 0.5, "y": 0.5}}
                    for fr in frames
                ],
                "meta": {"spriteResolution": resolution, "format": "SpriteAtlas"},
            }
            (self.asset_dir / "atlas.unity.json").write_text(
                json.dumps(unity, indent=2), encoding="utf-8"
            )


# ---------------------------------------------------------------------------
# PIL import (lazy)

try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore