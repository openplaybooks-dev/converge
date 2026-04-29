"""Generic tilemap-grid terrain sketcher.

Reads a `terrain` block from any scene JSON and renders a flat-color
schematic on a transparent overlay sized to the target API canvas.
Game-agnostic — the sketcher knows nothing about water/platforms/hazards;
it just iterates grid cells, looks each char up in the legend, and draws
its color (skipping cells whose color is null/missing).

Schema this module expects (lives inside scene-spec.json):

    "terrain": {
      "grid_size": [width_tiles, height_tiles],
      "legend": {
        "<char>": {
          "kind": "<name>",
          "color": "#RRGGBB" | null,
          "concept_hint": "human text"
        },
        ...
      },
      "rows": [
        "<width_tiles chars>",   # row 0
        "<width_tiles chars>",   # row 1
        ...
      ]                          # exactly height_tiles rows
    }

Coordinate system: grid cells are tile-indexed. The sketcher converts
(tile, tile) → (source-canvas-px, source-canvas-px) via tile_size_px,
then scales to API canvas via (sx, sy). Adjacent same-char cells are
run-length merged per row into single rectangles, so a 5-tile-wide
water span renders as one rect, not five.
"""

from __future__ import annotations

from PIL import Image, ImageDraw, ImageFilter


def _hex_rgba(h: str, alpha: int = 255) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)


def build_terrain_sketch(
    terrain: dict,
    src_w: int,
    src_h: int,
    api_w: int,
    api_h: int,
    *,
    tile_size_px: int,
    skip_left_px: int = 0,
) -> Image.Image:
    """Render the tilemap as a flat-color schematic overlay.

    src_w, src_h: source canvas dims (concept_tile_px * grid_size).
    api_w, api_h: target API canvas dims.
    tile_size_px: source pixels per CONCEPT tile (from
        terrain.concept_tile_px if present, else falls back to
        canvas.tile_size_px). The caller decides which.
    skip_left_px: leftmost API columns to leave clean (anchor lives there).
    """
    # Allow terrain.concept_tile_px to override the caller's choice.
    if terrain.get("concept_tile_px"):
        tile_size_px = int(terrain["concept_tile_px"])
    grid_size = terrain.get("grid_size") or [0, 0]
    grid_w, grid_h = int(grid_size[0]), int(grid_size[1])
    legend = terrain.get("legend") or {}
    rows = terrain.get("rows") or []

    if grid_w <= 0 or grid_h <= 0 or len(rows) != grid_h:
        return Image.new("RGBA", (api_w, api_h), (0, 0, 0, 0))

    sx = api_w / max(src_w, 1)
    sy = api_h / max(src_h, 1)
    cell_w = tile_size_px * sx
    cell_h = tile_size_px * sy

    overlay = Image.new("RGBA", (api_w, api_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Soft regions — RLE-merge contiguous same-kind cells per row into
    # ONE filled rectangle, no outline, no X. Adjacent rows with same kind
    # in the same column range will visually merge into a continuous
    # region. Then Gaussian-blur the whole overlay so edges are soft and
    # organic. The painter sees "areas of kind", not "grid of cells",
    # which produces natural curves rather than rigid cell boundaries.
    for y, row in enumerate(rows):
        if len(row) != grid_w:
            continue
        py_lo = int(round(y * cell_h))
        py_hi = int(round((y + 1) * cell_h))
        x = 0
        while x < grid_w:
            ch = row[x]
            x_end = x + 1
            while x_end < grid_w and row[x_end] == ch:
                x_end += 1
            entry = legend.get(ch)
            color_hex = entry.get("color") if isinstance(entry, dict) else None
            if color_hex:
                alpha = int(entry.get("alpha", 140)) if isinstance(entry, dict) else 140
                color = _hex_rgba(color_hex, alpha=alpha)
                px_lo = int(round(x * cell_w))
                px_hi = int(round(x_end * cell_w))
                px_lo = max(px_lo, skip_left_px)
                if px_hi > skip_left_px and px_hi > px_lo:
                    draw.rectangle([(px_lo, py_lo), (px_hi, py_hi)], fill=color)
            x = x_end

    # Gaussian blur to soften the rectangular edges into organic regions.
    blur_radius = max(2, int(round(min(cell_w, cell_h) * 0.35)))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    return overlay


def build_legend(terrain: dict) -> str:
    """Render the legend as a human-readable block for the prompt."""
    legend = terrain.get("legend") or {}
    if not legend:
        return "(no terrain in this scene)"
    lines = []
    for ch, entry in legend.items():
        if not isinstance(entry, dict):
            continue
        col = entry.get("color") or "(no fill — chroma stays)"
        kind = entry.get("kind", "?")
        hint = entry.get("concept_hint", "")
        lines.append(f"  - '{ch}' kind={kind:<10} color={col}  -> {hint}")
    return "\n".join(lines)
