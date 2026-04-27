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
# Grid auto-detection
#
# We tell the model "draw a 4x2 grid" but it sometimes lays out 4x3 or 3x3
# anyway. Rather than fighting the model, we detect the actual grid from
# the rendered sheet's alpha channel and write the atlas to match.


def detect_grid_layout(
    image_bytes_or_path,
    *,
    expected_cols: int | None = None,
    expected_rows: int | None = None,
    min_band_height_ratio: float = 0.05,
    min_band_density_ratio: float = 0.03,
) -> dict:
    """Scan the alpha channel of a sprite sheet and infer the actual grid.

    Parameters
    ----------
    image_bytes_or_path : bytes | Path | str
        Raw PNG bytes or a path to a PNG. Must have an alpha channel.
    expected_cols, expected_rows : int | None
        Hints used only as fallback if detection comes back empty (e.g.
        a fully-opaque sheet with no gaps).
    min_band_height_ratio : float
        A row of pixels counts as "occupied" when more than this fraction
        of its width is opaque. 5% works for sparse silhouettes.
    min_band_density_ratio : float
        A column of pixels counts as "occupied" when more than this
        fraction of its height is opaque.

    Returns
    -------
    dict with:
        cols, rows : int
        sheet_size : {w, h}
        frame_size : {w, h}    — derived from sheet/cols, sheet/rows
        frames : list[{filename, frame: {x,y,w,h}}]
        cell_origins : list[(x, y)]  — top-left of each cell in row-major order
        detected : bool        — True if we found bands; False if we fell
                                   back to the expected hint or to 1x1

    The returned `frame_size` is sheet/cols × sheet/rows, not the band
    bounding boxes — atlas consumers expect uniform cells. The cells will
    contain transparent margin around the actual character.
    """
    from PIL import Image
    import numpy as np
    import io

    if isinstance(image_bytes_or_path, (str, Path)):
        img = Image.open(image_bytes_or_path)
    else:
        img = Image.open(io.BytesIO(image_bytes_or_path))
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    arr = np.array(img)
    alpha = arr[:, :, 3]
    sheet_h, sheet_w = alpha.shape

    occupied_per_row = (alpha > 32).sum(axis=1)
    occupied_per_col = (alpha > 32).sum(axis=0)

    row_threshold = sheet_w * min_band_height_ratio
    col_threshold = sheet_h * min_band_density_ratio

    h_bands = _find_runs(occupied_per_row, row_threshold, min_run=max(8, sheet_h // 50))
    v_bands = _find_runs(occupied_per_col, col_threshold, min_run=max(8, sheet_w // 50))

    detected_rows = len(h_bands)
    detected_cols = len(v_bands)

    # Heuristic fallback: when the requested grid is well-defined and the
    # detector returns a much smaller grid (e.g. 1×1 when the user asked
    # for 4×2), the detector almost certainly missed the cell boundaries
    # because the cells' content blends across the natural gaps. Trust the
    # prompt's requested layout in that case.
    expected_total = (expected_cols or 1) * (expected_rows or 1)
    detected_total = max(1, detected_rows) * max(1, detected_cols)
    much_smaller = (
        expected_total >= 4
        and detected_total * 2 <= expected_total  # detected at most half what we expect
    )

    if detected_rows == 0 or detected_cols == 0 or much_smaller:
        # Fully transparent / fully opaque / detection collapsed —
        # fall back to the hint.
        rows = expected_rows or 1
        cols = expected_cols or 1
        detected = False
    else:
        rows = detected_rows
        cols = detected_cols
        detected = True

    frame_w = sheet_w // cols
    frame_h = sheet_h // rows

    cell_origins = []
    frames = []
    for r in range(rows):
        for c in range(cols):
            x = c * frame_w
            y = r * frame_h
            cell_origins.append((x, y))
            frames.append({
                "filename": f"frame_{r * cols + c:03d}.png",
                "frame": {"x": x, "y": y, "w": frame_w, "h": frame_h},
            })

    return {
        "cols": cols,
        "rows": rows,
        "sheet_size": {"w": sheet_w, "h": sheet_h},
        "frame_size": {"w": frame_w, "h": frame_h},
        "frames": frames,
        "cell_origins": cell_origins,
        "detected": detected,
        "h_bands": h_bands,
        "v_bands": v_bands,
    }


def _find_runs(occupancy: "np.ndarray", threshold: float, min_run: int = 1) -> list[tuple[int, int]]:
    """Find runs of indices where occupancy[i] > threshold. Discard runs
    shorter than `min_run` (filters single-pixel speckle on cell borders)."""
    occupied = occupancy > threshold
    runs: list[tuple[int, int]] = []
    in_run = False
    start = 0
    for i, v in enumerate(occupied):
        if v and not in_run:
            start = i
            in_run = True
        elif not v and in_run:
            if i - start >= min_run:
                runs.append((start, i - 1))
            in_run = False
    if in_run and len(occupied) - start >= min_run:
        runs.append((start, len(occupied) - 1))
    return runs


# ---------------------------------------------------------------------------
# Frame alignment
#
# After auto-detecting the grid we still have a per-cell jitter problem:
# the model draws each pose at a slightly different (x, y) within its
# cell. Phaser plays each frame at a fixed sprite anchor, so the
# character appears to slide horizontally and float vertically.
#
# align_frames_in_sheet() fixes this by re-pasting each character's bbox
# into a canonical position within its cell: centered horizontally,
# feet at the bottom edge. The PNG is rewritten in place. Per-frame
# anchor offsets (the original character's bbox center) are also
# returned so callers can record them in the atlas as a debug trail.


def align_frames_in_sheet(
    image_bytes: bytes,
    cols: int,
    rows: int,
    *,
    foot_padding: int = 4,
    alpha_threshold: int = 32,
) -> tuple[bytes, list[dict]]:
    """Re-paste each cell's subject into a canonical (torso-x, feet-bottom) position.

    Why torso-column instead of bbox-center: a walk cycle has wide-stride
    poses (arms forward + back leg trailing → bbox extends both directions)
    and tight-passing poses (limbs near body → narrow bbox). Centering by
    bbox makes the torso bob left/right between frames, which the eye
    reads as a horizontal jitter once per cycle.

    The torso column is estimated from the densest vertical opacity in the
    upper third of the bbox — the head/shoulders/chest stay still while
    arms and legs swing. That column is then placed at cell horizontal
    center.

    Returns (new_png_bytes, per_frame_anchors). Each anchor entry has:
      - original_bbox: (x0, y0, x1, y1) before alignment, in cell-local coords
      - torso_x:       column the aligner used as the horizontal anchor
      - aligned_bbox:  (x0, y0, x1, y1) after alignment, in cell-local coords
      - shift: (dx, dy) applied to move the character

    `foot_padding` leaves a few pixels below the feet so descenders
    (long shadows, weapon tips touching ground) don't get clipped.
    """
    from PIL import Image
    import numpy as np
    import io

    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    sheet_w, sheet_h = img.size
    cell_w = sheet_w // cols
    cell_h = sheet_h // rows

    arr = np.array(img)
    alpha = arr[:, :, 3]

    # Build a fresh transparent canvas, paste aligned cells into it.
    out = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    anchors: list[dict] = []

    for r in range(rows):
        for c in range(cols):
            cx0, cy0 = c * cell_w, r * cell_h
            cell_alpha = alpha[cy0:cy0 + cell_h, cx0:cx0 + cell_w]
            ys, xs = np.where(cell_alpha > alpha_threshold)
            if len(xs) == 0:
                anchors.append({
                    "original_bbox": None,
                    "torso_x": None,
                    "aligned_bbox": None,
                    "shift": (0, 0),
                })
                continue

            x0, x1 = int(xs.min()), int(xs.max())
            y0, y1 = int(ys.min()), int(ys.max())
            char_w = x1 - x0 + 1
            char_h = y1 - y0 + 1

            # Estimate the horizontal anchor from the MID-TORSO BAND
            # (char_h * [0.25, 0.75]). This skips the head silhouette
            # (which can connect to a hat or hair, throwing off detection)
            # and skips the legs/feet (which fan wide during stride). The
            # torso/hip band is the body's stable mass center across the
            # cycle. We weight by per-column opacity so the result is
            # the "center of mass x" within the band — robust against
            # arm extensions on either side because arms in the mid-band
            # are thin compared to the torso column.
            mid_y0 = y0 + char_h // 4
            mid_y1 = y0 + (char_h * 3) // 4
            mid_band = cell_alpha[mid_y0:mid_y1 + 1, x0:x1 + 1]
            col_density = (mid_band > alpha_threshold).sum(axis=0)
            total_mass = col_density.sum()
            if total_mass == 0:
                torso_local = (x1 - x0) // 2
            else:
                col_indices = np.arange(col_density.size)
                torso_local = int((col_indices * col_density).sum() / total_mass)
            torso_x_in_cell = x0 + torso_local  # cell-local x of the torso column

            # Crop the actual character from the source cell.
            src_box = (cx0 + x0, cy0 + y0, cx0 + x1 + 1, cy0 + y1 + 1)
            cropped = img.crop(src_box)

            # Place torso column at cell horizontal center.
            target_torso = cell_w // 2
            new_x0 = target_torso - torso_local
            # Clamp so we don't push the bbox out of the cell.
            if new_x0 < 0:
                new_x0 = 0
            if new_x0 + char_w > cell_w:
                new_x0 = cell_w - char_w

            # Feet at bottom (unchanged from before).
            new_y1 = cell_h - 1 - foot_padding
            new_y0 = new_y1 - char_h + 1
            if new_y0 < 0:
                new_y0 = 0
                new_y1 = char_h - 1

            out.paste(cropped, (cx0 + new_x0, cy0 + new_y0), cropped)

            anchors.append({
                "original_bbox": [x0, y0, x1, y1],
                "torso_x": torso_x_in_cell,
                "aligned_bbox": [new_x0, new_y0, new_x0 + char_w - 1, new_y0 + char_h - 1],
                "shift": [new_x0 - x0, new_y0 - y0],
            })

    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return buf.getvalue(), anchors


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
