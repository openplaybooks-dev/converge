"""
Shared prompt builders for image generation.

Originally a fixed 4x4 grid (16 frames per sheet). The all-in-one-call
approach drifted: gpt-image-1 sometimes produced 4x3 instead of 4x4,
silently dropping a row. Switched to a rectangular cols x rows grid so
the layout is parameterized — characters use 4 cols x 2 rows (8 unique
poses, no tiling) which the model lays out reliably.

Used by character spritesheets, prop spritesheets, and any other
single-call grid asset.
"""

from __future__ import annotations

import json

from lib.art_styles import get_preset
from lib.image_api import VIEWPORT_CONTRACT


# Default sheet layout. Characters and props both use 4x2 (8 frames).
# Picked because gpt-image-1 reliably lays out 8 cells, but failed at 16.
DEFAULT_COLS = 4
DEFAULT_ROWS = 2

# Back-compat: a few older imports read GRID. It now means "default cols".
GRID = DEFAULT_COLS


def build_grid_prompt(
    *,
    subject: str,
    state: str,
    palette: str,
    palette_constraints: str,
    keyframes: list[str],
    frame_width: int,
    frame_height: int,
    cols: int = DEFAULT_COLS,
    rows: int = DEFAULT_ROWS,
    viewing_angle: str | None = None,
    art_style: str | None = None,
    frame_rate: int = 8,
    extra_critical_instructions: list[str] | None = None,
    viewport_contract: str = VIEWPORT_CONTRACT,
) -> str:
    """One prompt asking the model to render a cols×rows grid in one canvas.

    Listing every keyframe pose inline lets the model plan the cycle as a
    coherent unit and keep the subject identity fixed across all cells.

    `viewing_angle` is character-specific (locked side_left etc.); for props
    and other non-character assets pass None and the angle clause is omitted.

    `art_style` is the name of a preset in lib/art_styles.py:PRESETS. None
    falls back to the project default (DEFAULT_PRESET). The preset's
    style description, palette guidance, and negative directives are all
    woven into the prompt so the model adopts the requested look.
    """
    preset = get_preset(art_style)
    n = len(keyframes)
    expected = cols * rows
    if n != expected:
        raise ValueError(
            f"build_grid_prompt: got {n} keyframes for a {cols}x{rows} grid "
            f"but the grid has {expected} cells. Provide exactly {expected} keyframes."
        )

    sheet_width = cols * frame_width
    sheet_height = rows * frame_height

    pose_lines = []
    for i in range(n):
        row = i // cols
        col = i % cols
        x = col * frame_width
        y = row * frame_height
        # Each pose-line names its neighbours so the model treats the
        # cells as a CONTINUOUS arc, not 8 unrelated drawings. First
        # frame leads into frame 2; last frame loops back to frame 1.
        prev_n = n if i == 0 else i  # 1-indexed previous-frame number
        next_n = 1 if i == n - 1 else i + 2  # 1-indexed next-frame number
        bridge = (
            f"opening of the cycle, leading into Frame {next_n}"
            if i == 0 else
            f"closing of the cycle, looping back to Frame {next_n}"
            if i == n - 1 else
            f"small continuation of Frame {prev_n} toward Frame {next_n}"
        )
        pose_lines.append(
            f"  Frame {i + 1} (row {row + 1}, col {col + 1}, x={x}, y={y}) — {bridge}: {keyframes[i]}"
        )
    poses_block = "\n".join(pose_lines)

    row_y_list = ", ".join(f"row {r+1} at y={r*frame_height}" for r in range(rows))
    col_x_list = ", ".join(f"col {c+1} at x={c*frame_width}" for c in range(cols))

    critical_instructions = [
        f"Draw a {cols}-column × {rows}-row GRID of {n} SEPARATE drawings on one canvas — NOT one large image. The canvas is divided into {n} independent cells of {frame_width}×{frame_height} each, and each cell contains its OWN small drawing of the subject in a different pose",
        f"Each cell's subject must fit ENTIRELY within its {frame_width}×{frame_height} cell — do NOT let the subject span multiple cells, do NOT draw one big subject across the whole canvas",
        f"FAILURE MODE TO AVOID: producing one large {sheet_width}×{sheet_height} drawing of the subject, OR producing fewer rows/cols than requested ({cols} cols × {rows} rows). The correct output is exactly {n} small {frame_width}×{frame_height} drawings arranged in a {cols}×{rows} grid",
        f"Each of the {n} cells shows the subject at a SLIGHTLY different point in a continuous animation cycle — adjacent cells should look 80–90% identical, with only the limbs in motion shifting between frames. The cycle plays at {frame_rate} fps, so consecutive frames are only ~{int(1000/frame_rate)} ms apart in time and the pose delta between them must be small. Do NOT draw 8 visually-distinct independent poses; draw 8 small increments of one continuous motion arc.",
        "All frames share identical subject identity (same shape, same colors, same proportions)",
        "All frames share identical viewport per-cell (camera, framing, scale, ground line) — the camera does not pan or zoom between cells",
        "Only the body POSE / animation phase changes between frames",
        "Background is FULLY TRANSPARENT (alpha = 0) across the entire sheet — output a PNG with transparency. Do NOT paint any background color (no green, no blue, no white, no black). Every pixel that is not part of the subject must have alpha = 0",
        "No gaps, borders, dividers, frame numbers, labels, or grid lines between cells — the cells are conceptual, not visually marked",
        "Subject pixels are fully opaque; non-subject pixels are fully transparent. The PNG must have a real alpha channel — no flat-color background plate",
    ]
    # Preset-specific negatives (e.g. "do NOT produce pixel art") — these
    # are strong style guards that override any retro phrasing that may
    # have leaked into individual manifest descriptions.
    critical_instructions.extend(preset.get("negative_directives", []))
    if extra_critical_instructions:
        critical_instructions.extend(extra_critical_instructions)

    prompt_data = {
        "task": "generate_animation_spritesheet",
        "subject": subject,
        "state": state,
        "layout": {
            "type": f"{cols}x{rows}_grid",
            "frame_count": n,
            "rows": rows,
            "cols": cols,
            "frame_size": [frame_width, frame_height],
            "sheet_size": [sheet_width, sheet_height],
            "frame_order": "left-to-right, top-to-bottom",
        },
        "palette": palette or preset["palette_guidance"],
        "palette_constraints": palette_constraints,
        "art_style": preset["style_name"],
        "art_style_description": preset["style_description"],
        "background": "TRANSPARENT (alpha=0) — output a PNG with native transparency, no painted background",
        "critical_instructions": critical_instructions,
    }
    if viewing_angle:
        prompt_data["viewing_angle"] = viewing_angle
    json_str = json.dumps(prompt_data, indent=2)

    angle_clause = (
        f"Viewing angle is fixed at {viewing_angle} (matches the reference image you've been given). Do not rotate the camera between frames. Do not zoom. Do not re-frame."
        if viewing_angle
        else "Viewing angle is fixed and matches the reference image you've been given. Do not rotate the camera between frames. Do not zoom. Do not re-frame."
    )

    return f"""Draw a {cols}-column × {rows}-row sprite sheet ({n} frames) for {subject}'s {state} animation cycle. The output is ONE image of {n} SEPARATE small drawings tiled in a grid — NOT one large drawing.

ART STYLE (mandatory, applies to every cell): {preset["style_description"]}


Canvas: exactly {sheet_width}×{sheet_height} pixels, mentally divided into a {cols}-column × {rows}-row grid of {n} independent cells. Each cell is exactly {frame_width}×{frame_height} pixels. Each cell contains its OWN small drawing of {subject} in a different pose. The subject in each cell is sized to fit within that cell with margin — do NOT draw one large {subject} that spans the whole canvas.

Cell coordinates (origin top-left, x→right, y→down):
- Rows: {row_y_list}
- Cols: {col_x_list}
Frames are ordered left-to-right within each row, then top-to-bottom across rows. The grid has exactly {rows} row(s) and {cols} column(s) — do not produce more or fewer rows.

The {n} cells are conceptual — DO NOT draw any borders, dividers, frame numbers, labels, or grid lines between them. Background is FULLY TRANSPARENT across the entire {sheet_width}×{sheet_height} canvas. The PNG output must have a real alpha channel where every non-subject pixel has alpha = 0. Do NOT paint a background color — no green, no white, no checker, no gradient. Empty space inside each cell around the subject is also transparent.

SMOOTHNESS (read this BEFORE drawing any frame): These {n} cells play back at {frame_rate} fps as a continuous looping animation cycle, not as 8 isolated illustrations. Adjacent cells should look 80–90% identical; only the limbs/body parts in motion shift between consecutive frames, and they shift by SMALL increments. The pose change between any two adjacent cells should be subtle enough that an animator could draw a missing in-between frame without inventing a new pose. Avoid sudden jumps, large body-position shifts, or "discrete pose" thinking. Cell N should look like a slight nudge from cell N-1, and lead naturally into cell N+1. The final cell loops back to cell 1, so cell {n}'s pose must lead seamlessly into cell 1's pose.

Per-frame poses (in left-to-right, top-to-bottom order — each one is the ONLY drawing that goes in that cell, AND each one is a small step along the continuous cycle described above):
{poses_block}

Identity is fixed across cells. Every cell shows the SAME subject — same shape, same colors, same proportions, same scale. The subject does not change appearance between cells; only the body pose / animation phase changes by a small increment.

{angle_clause}

{viewport_contract}
Palette discipline (mandatory, overrides the JSON below if there's any conflict):
{palette_constraints}

The output is a transparent PNG. Subject pixels are fully opaque; everything else has alpha = 0. Do NOT add any background color or fill — transparency is the background.

Structured spec for reference:

{json_str}
"""


# Back-compat shim. Old callers imported `build_4x4_grid_prompt`. Keep it
# working by forwarding to the new builder with default 4x2 (which is no
# longer 4x4 — but no caller actually uses the old name now that the two
# generation scripts have been updated to call build_grid_prompt directly).
def build_4x4_grid_prompt(*args, **kwargs):
    """Deprecated alias for build_grid_prompt. Defaults to 4 cols × 2 rows."""
    return build_grid_prompt(*args, **kwargs)
