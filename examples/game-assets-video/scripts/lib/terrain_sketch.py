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

    # Crisp position cues: per-row RLE-merged rectangles with a low-alpha
    # FILL (the AI sees "what kind goes here") plus a high-alpha OUTLINE
    # (the AI sees the exact footprint boundary). NO blur — positional
    # fidelity matters more than aesthetic softness here. The prompt
    # tells the model to paint INSIDE the outlined footprint.
    stroke = max(1, int(round(min(cell_w, cell_h) * 0.10)))
    fill_alpha_default = 70
    outline_alpha_default = 220

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
                fill_alpha = int(entry.get("fill_alpha", fill_alpha_default)) if isinstance(entry, dict) else fill_alpha_default
                outline_alpha = int(entry.get("outline_alpha", outline_alpha_default)) if isinstance(entry, dict) else outline_alpha_default
                fill_color = _hex_rgba(color_hex, alpha=fill_alpha)
                outline_color = _hex_rgba(color_hex, alpha=outline_alpha)
                px_lo = int(round(x * cell_w))
                px_hi = int(round(x_end * cell_w))
                px_lo = max(px_lo, skip_left_px)
                if px_hi > skip_left_px and px_hi > px_lo:
                    draw.rectangle(
                        [(px_lo, py_lo), (px_hi - 1, py_hi - 1)],
                        fill=fill_color, outline=outline_color, width=stroke,
                    )
            x = x_end

    return overlay


def extract_feature_regions(terrain: dict, skip_kinds: tuple[str, ...] = ("vast",)) -> list[dict]:
    """Flood-fill contiguous same-kind cells into discrete features.

    Returns a list of {kind, char, x_lo, y_lo, x_hi, y_hi (tile coords,
    inclusive bbox), x_lo_pct, y_lo_pct, x_hi_pct, y_hi_pct} entries.
    Skips kinds in skip_kinds (default: vast = no feature). 4-connected
    BFS so diagonally-touching cells are separate features.
    """
    grid_w, grid_h = terrain.get("grid_size") or [0, 0]
    rows = terrain.get("rows") or []
    legend = terrain.get("legend") or {}
    if grid_w <= 0 or grid_h <= 0 or len(rows) != grid_h:
        return []
    skip_chars = {ch for ch, e in legend.items()
                  if isinstance(e, dict) and e.get("kind") in skip_kinds}

    seen = [[False] * grid_w for _ in range(grid_h)]
    out: list[dict] = []
    for y in range(grid_h):
        if len(rows[y]) != grid_w:
            continue
        for x in range(grid_w):
            if seen[y][x]: continue
            ch = rows[y][x]
            if ch in skip_chars or ch not in legend:
                seen[y][x] = True
                continue
            # BFS from (x,y) over same-char 4-connected cells.
            stack = [(x, y)]
            x_lo, x_hi = x, x
            y_lo, y_hi = y, y
            while stack:
                cx, cy = stack.pop()
                if cx < 0 or cy < 0 or cx >= grid_w or cy >= grid_h: continue
                if seen[cy][cx]: continue
                if rows[cy][cx] != ch: continue
                seen[cy][cx] = True
                if cx < x_lo: x_lo = cx
                if cx > x_hi: x_hi = cx
                if cy < y_lo: y_lo = cy
                if cy > y_hi: y_hi = cy
                stack.append((cx + 1, cy))
                stack.append((cx - 1, cy))
                stack.append((cx, cy + 1))
                stack.append((cx, cy - 1))
            entry = legend.get(ch, {})
            kind = entry.get("kind", "?") if isinstance(entry, dict) else "?"
            out.append({
                "kind": kind,
                "char": ch,
                "x_lo": x_lo, "y_lo": y_lo, "x_hi": x_hi, "y_hi": y_hi,
                "x_lo_pct": round(100.0 * x_lo / grid_w, 1),
                "x_hi_pct": round(100.0 * (x_hi + 1) / grid_w, 1),
                "y_lo_pct": round(100.0 * y_lo / grid_h, 1),
                "y_hi_pct": round(100.0 * (y_hi + 1) / grid_h, 1),
            })
    return out


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
