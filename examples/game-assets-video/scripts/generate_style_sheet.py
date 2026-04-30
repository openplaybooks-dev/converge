#!/usr/bin/env python3
"""generate_style_sheet.py — Render the project's universal style anchor.

Produces `assets/concept/style-sheet.png`: one image showing 3 sample
props and 3 sample tiles drawn in the project's target art style. Every
downstream prop/tile/bg generator prepends this PNG as its first
reference (via `lib.style_anchor.attach_style_anchor`), so all generated
assets share one visual source of truth.

Inputs (read but no paid call beyond the one image-gen):
  - idea.md
  - assets/game.json (for art-style preset + category info)
  - assets/visual-target.png (compositional reference)
  - assets/concept/hero-shot.png (style anchor from 01-art-bible)
  - assets/objects.json or objects-shared.json (sample prop names)
  - assets/scenes.json (sample tile descriptions, optional)

Output:
  - assets/concept/style-sheet.png        (1536×1024, 2×3 cell grid)
  - assets/concept/style-sheet.prompt.txt
  - assets/concept/style-sheet.seed.txt

Usage:
  python scripts/generate_style_sheet.py [--seed N]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib import budget
from lib.art_styles import get_preset
from lib.game import get_camera_spec, load_game_manifest
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root
from lib.style_anchor import hero_shot_path


SHEET_W = 1536
SHEET_H = 1024
COLS = 3
ROWS = 2
CELL_W = SHEET_W // COLS  # 512
CELL_H = SHEET_H // ROWS  # 512
API_ASPECT = "3:2"


GENERIC_PROP_SAMPLES = [
    "small ornate golden key resting at rest, gem inset, soft shadow on ground",
    "small red glass potion flask with cork stopper, soft inner glow",
    "small grey stone block with three short metal spikes emerging from the top, dangerous read",
]

GENERIC_TILE_SAMPLES = [
    "grass-top terrain tile: short grass blades on top half, packed earth on bottom half, edges left and right designed to abut identical neighbors seamlessly",
    "earth-fill terrain tile: solid packed earth with a few embedded pebbles, edges designed to tile seamlessly on all four sides",
    "stone-edge terrain tile: grey stone with rounded top edge, transitioning to earth on the bottom, edges match an earth-fill tile to its right",
]


def pick_prop_samples(project_root: Path) -> list[str]:
    """Pick three short prop descriptions from the project's manifest, or
    fall back to generic samples. We keep them short so the prompt stays
    legible and the model treats them as style swatches, not detailed
    spec for the *real* prop generation later."""
    for fname in ("objects.json", "objects-shared.json"):
        path = project_root / "assets" / fname
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        picked = []
        for entry in data:
            desc = entry.get("description") or entry.get("name")
            if desc:
                picked.append(str(desc).strip())
            if len(picked) >= 3:
                break
        if len(picked) == 3:
            return picked
    return GENERIC_PROP_SAMPLES


def pick_tile_samples(project_root: Path) -> list[str]:
    scenes_path = project_root / "assets" / "scenes.json"
    if scenes_path.exists():
        try:
            scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
        except Exception:
            scenes = []
        for scene in scenes:
            tiles = (scene.get("tilemap") or {}).get("tile_variants") or []
            if len(tiles) >= 3:
                return [
                    f"{t.get('id', 'tile')}: {t.get('description', 'terrain tile')}"
                    for t in tiles[:3]
                ]
    return GENERIC_TILE_SAMPLES


def build_prompt(idea: str, art_style: str | None, camera: dict, props: list[str], tiles: list[str]) -> str:
    preset = get_preset(art_style)
    style_desc = preset["style_description"]
    palette_guidance = preset["palette_guidance"]
    negatives = preset.get("negative_directives", [])
    negatives_block = "\n".join(f"- {n}" for n in negatives) if negatives else "- (none)"

    return f"""Style reference sheet for a 2D game asset library. ONE IMAGE, 3 columns × 2 rows.
Each of the 6 cells shows a single subject centered on a transparent or neutral background.
The cells share ONE consistent rendering style — same line weight, same palette, same shading
language, same level of detail. This sheet will be used as the visual anchor for every
downstream asset generation call, so style consistency is the entire purpose of this image.

GAME BRIEF (for context only, do not draw scene content):
{idea.strip()}

CAMERA (mandatory, all 6 cells — every painted asset in this project shares this viewing angle):
{camera['description']}

ART STYLE (mandatory, all 6 cells):
{style_desc}

PALETTE:
{palette_guidance}

LAYOUT (3 columns × 2 rows, cell size {CELL_W}×{CELL_H} px):

ROW 1 — sample props (top row):
- Cell (1,1): {props[0]}
- Cell (1,2): {props[1]}
- Cell (1,3): {props[2]}

ROW 2 — sample terrain tiles (bottom row):
- Cell (2,1): {tiles[0]}
- Cell (2,2): {tiles[1]}
- Cell (2,3): {tiles[2]}

CRITICAL CONSISTENCY RULES (this is the whole point of the sheet):
- All 6 cells must share IDENTICAL rendering style — same brush, same line weight, same shading model.
- Use the SAME palette across all 6 cells. Pick a small set of hues and reuse them.
- Each subject is centered in its cell with comparable scale (props occupy ~70% of cell; tiles fill cell edge-to-edge).
- Props (top row): subjects on a flat soft-grey background or transparent; soft drop shadow; no scenery behind them.
- Tiles (bottom row): edge-to-edge fills designed to TILE — left/right edges of adjacent cells in the same row should match if placed next to each other.
- Lighting source consistent across all cells (top-left soft key light suggested).

DO NOT (negative directives):
{negatives_block}
- Do NOT add any captions, labels, frame numbers, watermarks, or annotations on the sheet.
- Do NOT draw extra content beyond the 6 specified subjects.
- Do NOT vary the rendering style between cells — that defeats the entire purpose.
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    idea_path = project_root / "idea.md"
    if not idea_path.exists():
        raise SystemExit(f"idea.md not found at {idea_path}")
    idea = idea_path.read_text(encoding="utf-8")

    game = load_game_manifest(project_root)
    art_style = (
        game.get("art_style")
        or (game.get("art_style_keywords") and game["art_style_keywords"][0])
        or None
    )
    camera = get_camera_spec(game)

    props = pick_prop_samples(project_root)
    tiles = pick_tile_samples(project_root)

    prompt = build_prompt(idea, art_style, camera, props, tiles)

    refs: list[Path] = []
    hero_shot = hero_shot_path(project_root)
    visual_target = project_root / "assets" / "visual-target.png"
    if hero_shot.exists():
        refs.append(hero_shot)
    if visual_target.exists():
        refs.append(visual_target)
    if not refs:
        raise SystemExit(
            "Need at least one of assets/concept/hero-shot.png or "
            "assets/visual-target.png as a style anchor input. Run "
            "01-art-bible and 00-visual-target first."
        )
    base_ref = refs[0]
    extra_refs = refs[1:]

    # Per-asset folder: the project's universal style anchor lives in
    # assets/concept/style-sheet/ with its sidecars.
    asset_dir = project_root / "assets" / "concept" / "style-sheet"
    asset_dir.mkdir(parents=True, exist_ok=True)
    png_path = asset_dir / "image.png"
    prompt_path = asset_dir / "prompt.md"
    seed_path = asset_dir / "seed.txt"

    backend = active_backend()
    cost = budget.cost_for_image(backend)

    print(
        f"[style-sheet] generating {SHEET_W}x{SHEET_H} 2x3 reference sheet "
        f"backend={backend} cost={cost}c base={base_ref.relative_to(project_root)}",
        file=sys.stderr,
    )

    with budget.charged(project_root, cost, f"image-{backend}", note="style-sheet"):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            base_ref,
            extra_refs,
            seed=args.seed,
            aspect_ratio=API_ASPECT,
            resolution=(SHEET_W, SHEET_H),
        )

    png_path.write_bytes(img_bytes)
    prompt_path.write_text(prompt, encoding="utf-8")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    print(
        f"  wrote {png_path.relative_to(project_root)} (seed={seed_used})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
