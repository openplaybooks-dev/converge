#!/usr/bin/env python3
"""generate_landscape_concept.py — Render per-biome landscape concept art.

Produces `assets/concept/landscape-{biome}.png` for every biome the
project uses. Each image is a wide painterly establishing shot (no
characters, no UI, no gameplay tokens) that locks the biome's visual
atmosphere — sky, distant silhouettes, midground forms, ground line,
foreground frame — in the project's target style.

Downstream scene tasks (notably 05-scenes/00-mapping) attach the
biome's landscape concept as a binding visual reference so the AI
authoring per-scene mappings sees the actual painted target instead
of just text style rules.

Cached per biome on file existence — biomes whose
`landscape-{biome}.png` already exists are skipped unless --force.

Inputs:
  - idea.md
  - assets/game.json (for art-style preset + biome list)
  - assets/visual-target.png (compositional reference)
  - assets/concept/hero-shot.png (style anchor from 01-art-bible)
  - assets/concept/style-sheet.png (universal style anchor from 01b)
  - assets/ART_BIBLE.md (palette + environment forms)

Output (per biome):
  - assets/concept/landscape-{biome}.png        (1536×1024)
  - assets/concept/landscape-{biome}.prompt.txt
  - assets/concept/landscape-{biome}.seed.txt

Usage:
  python scripts/generate_landscape_concept.py                    # all biomes
  python scripts/generate_landscape_concept.py grassland          # one biome
  python scripts/generate_landscape_concept.py --force            # re-render even if cached
  python scripts/generate_landscape_concept.py --seed N           # reproducible seed
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
from lib.style_anchor import hero_shot_path, style_sheet_path


SHEET_W = 1536
SHEET_H = 1024
API_ASPECT = "3:2"


def discover_biomes(project_root: Path) -> list[str]:
    """Mirrors author_tokens.discover_biomes — single source of truth would
    be nicer but the import surface is keep-it-simple here."""
    game = load_game_manifest(project_root)
    biomes = game.get("biomes")
    if isinstance(biomes, list) and biomes:
        return [str(b) if isinstance(b, str) else str(b.get("id")) for b in biomes]
    tm = game.get("asset_categories", {}).get("tilemap", {}).get("variants", [])
    if tm:
        return [str(t.get("id") or t) for t in tm]
    return ["grassland"]


def build_prompt(idea: str, biome: str, art_style: str | None, art_bible: str, camera: dict) -> str:
    preset = get_preset(art_style)
    style_desc = preset["style_description"]
    palette_guidance = preset["palette_guidance"]
    negatives = preset.get("negative_directives", [])
    negatives_block = "\n".join(f"- {n}" for n in negatives) if negatives else "- (none)"

    return f"""Wide painterly establishing shot for the `{biome}` biome of a 2D side-scrolling
game. ONE IMAGE, 3:2 aspect, {SHEET_W}×{SHEET_H} px. This image is the binding
visual reference for every painted scene authored in this biome — it locks the
biome's atmosphere, palette, and form vocabulary in one piece of art.

GAME BRIEF (for context only, do not draw scene content):
{idea.strip()}

BIOME: `{biome}`

CAMERA (mandatory — every painted asset in this project shares this viewing angle):
{camera['description']}

ART STYLE (mandatory):
{style_desc}

PALETTE:
{palette_guidance}

ART BIBLE EXCERPT (the project's binding visual rules):
{art_bible.strip()}

LAYOUT — a wide landscape with clear parallax depth, back-to-front:
- Sky / atmosphere fills the top third — color temperature and time of day
  appropriate to this biome.
- Distant silhouettes (mountains, far tree bands, distant ruins) at ~15-30%
  height from the top — desaturated, atmospheric haze applied.
- Mid-distance forms (tree clusters, hills, mid-distance structures) at
  ~40-60% height — softer detail than foreground but readable.
- Ground line / play layer at ~70-85% height — the surface a player would
  walk on, sharp and saturated. Grass / dirt / rock / water as appropriate
  to the biome.
- Foreground frame element on one side (a branch, vines, a column) — near
  silhouette, slight focus blur, darker palette. Frames the camera.

CRITICAL CONSTRAINTS:
- NO characters. NO player. NO enemies. NO UI / HUD / text. NO captions.
- NO gameplay tokens — no platforms, no spike traps, no pickups, no spawn
  markers. This is pure landscape concept art, not a level layout.
- The image's job is to show the painter what the biome LOOKS LIKE in this
  project's style. Tokens come later from a separate library.
- Honor the ART_BIBLE palette exactly. Match the rendering style of the
  reference images (style-sheet, hero-shot, visual-target) on every detail.
- Atmospheric depth: distant elements desaturated and cooler; near elements
  saturated and crisper.

DO NOT (negative directives):
{negatives_block}
- Do NOT add captions, labels, frame numbers, watermarks, or annotations.
- Do NOT include any character or sprite-like content.
- Do NOT depict gameplay mechanics (jumps, hazards, collectibles).
"""


def generate_one(
    *,
    biome: str,
    project_root: Path,
    idea: str,
    art_style: str | None,
    art_bible: str,
    camera: dict,
    refs: list[Path],
    force: bool,
    seed: int | None,
) -> bool:
    """Generate one biome's landscape concept. Returns True if generated or
    already cached, False on failure."""
    # Per-asset folder: each biome's landscape concept lives in its own
    # folder under assets/concept/landscape-{biome}/.
    asset_dir = project_root / "assets" / "concept" / f"landscape-{biome}"
    asset_dir.mkdir(parents=True, exist_ok=True)
    png_path = asset_dir / "image.png"
    prompt_path = asset_dir / "prompt.md"
    seed_path = asset_dir / "seed.txt"

    if png_path.exists() and not force:
        print(
            f"  [{biome}] skip ({png_path.relative_to(project_root)} already exists, "
            f"pass --force to regenerate)",
            file=sys.stderr,
        )
        return True

    prompt = build_prompt(idea, biome, art_style, art_bible, camera)
    base_ref = refs[0]
    extra_refs = refs[1:]

    backend = active_backend()
    cost = budget.cost_for_image(backend)
    print(
        f"  [{biome}] generating {SHEET_W}x{SHEET_H} landscape concept "
        f"backend={backend} cost={cost}c base={base_ref.relative_to(project_root)}",
        file=sys.stderr,
    )

    with budget.charged(project_root, cost, f"image-{backend}", note=f"landscape-concept {biome}"):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            base_ref,
            extra_refs,
            seed=seed,
            aspect_ratio=API_ASPECT,
            resolution=(SHEET_W, SHEET_H),
        )

    png_path.write_bytes(img_bytes)
    prompt_path.write_text(prompt, encoding="utf-8")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    print(
        f"  [{biome}] wrote {png_path.relative_to(project_root)} (seed={seed_used})",
        file=sys.stderr,
    )
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("biome", nargs="?", help="biome name; omit to render every biome in game.json")
    ap.add_argument("--force", action="store_true", help="re-render even if landscape-{biome}.png exists")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    idea_path = project_root / "idea.md"
    if not idea_path.exists():
        raise SystemExit(f"idea.md not found at {idea_path}")
    idea = idea_path.read_text(encoding="utf-8")

    art_bible_path = project_root / "assets" / "ART_BIBLE.md"
    if not art_bible_path.exists():
        raise SystemExit(
            f"{art_bible_path} not found — run 01-art-bible first."
        )
    art_bible = art_bible_path.read_text(encoding="utf-8")

    game = load_game_manifest(project_root)
    art_style = (
        game.get("art_style")
        or (game.get("art_style_keywords") and game["art_style_keywords"][0])
        or None
    )
    camera = get_camera_spec(game)

    refs: list[Path] = []
    style_sheet = style_sheet_path(project_root)
    hero_shot = hero_shot_path(project_root)
    visual_target = project_root / "assets" / "visual-target.png"
    # Order matters: the first ref is the strongest style signal in image-edit.
    if style_sheet.exists():
        refs.append(style_sheet)
    if hero_shot.exists():
        refs.append(hero_shot)
    if visual_target.exists():
        refs.append(visual_target)
    if not refs:
        raise SystemExit(
            "Need at least one of assets/concept/style-sheet.png, "
            "assets/concept/hero-shot.png, or assets/visual-target.png as a "
            "style anchor input. Run 00-visual-target, 01-art-bible, and "
            "01b-style-sheet first."
        )

    targets = [args.biome] if args.biome else discover_biomes(project_root)
    print(f"landscape-concept: {len(targets)} biome(s): {targets}", file=sys.stderr)

    ok = 0
    fail = 0
    for biome in targets:
        try:
            if generate_one(
                biome=biome,
                project_root=project_root,
                idea=idea,
                art_style=art_style,
                art_bible=art_bible,
                camera=camera,
                refs=refs,
                force=args.force,
                seed=args.seed,
            ):
                ok += 1
            else:
                fail += 1
        except SystemExit:
            raise
        except Exception as e:
            print(f"  [{biome}] EXCEPTION: {e}", file=sys.stderr)
            fail += 1

    print(f"\nlandscape-concept: {ok} ok, {fail} failed", file=sys.stderr)
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
