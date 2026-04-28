#!/usr/bin/env python3
"""decompose_catalog.py — Decompose project intent into a canonical asset catalog.

Reads `idea.md` + `assets/game.json` + `assets/sprites.json` +
`assets/objects.json` (or `objects-shared.json`) and asks the model to
produce one JSON catalog declaring every shared prop's `animation_type`
(static | loop | trigger), the matching keyframes cycle id, and a tile
family hint per game type.

Downstream prop and tile generators read `assets/catalog.json` instead
of inferring per-prop intent from heuristics scattered across scripts.

Cost: 1 text-out call (~5¢ on Gemini).

Usage:
  python scripts/decompose_catalog.py
  python scripts/decompose_catalog.py --force   # regenerate even if catalog.json exists
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import textwrap
from pathlib import Path

from lib import budget
from lib.image_api import active_backend
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


KNOWN_KEYFRAMES = [
    "prop_idle",   # cyclic hover/shimmer (default for collectibles)
    "collect",     # one-shot pickup effect
    "trigger",     # cyclic hazard activation (generic)
    "bounce",      # cyclic spring oscillation
    "activate",    # cyclic flag/marker wave
    # Per-prop semantic cycles added by Phase A4:
    "spike_trap_trigger",
    "bounce_spring_trigger",
    "gold_key_idle",
    "health_potion_idle",
]

VALID_ANIMATION_TYPES = ["static", "loop", "trigger"]


def build_prompt(idea: str, game: dict, sprites: list, objects: list) -> str:
    game_type = game.get("game_type", "platformer")
    asset_cats = game.get("asset_categories") or {}
    enabled = [k for k, v in asset_cats.items() if (v or {}).get("enabled", True)]

    return textwrap.dedent(f"""\
        You are decomposing a 2D game project into a canonical asset catalog.
        Your output drives every downstream prop/tile generator — picking
        the wrong animation_type means the generator either skips frames
        the prop needs or wastes calls drawing 8 near-identical frames for
        a static prop.

        Game type: {game_type}
        Enabled asset categories: {", ".join(enabled)}

        Game brief (`idea.md`):

        ```
        {idea.strip()}
        ```

        Existing characters (`sprites.json`, list of objects with id/name/description):
        ```json
        {json.dumps(sprites, indent=2)}
        ```

        Existing props (`objects.json` / `objects-shared.json`):
        ```json
        {json.dumps(objects, indent=2)}
        ```

        Output ONE JSON object, in this exact schema:

        ```json
        {{
          "art_style": {{
            "id": "<art_style_id from game.json>",
            "palette_swatch": "<short hex-list summary, 5-8 colors>"
          }},
          "characters": [
            {{ "id": "<from sprites.json>", "name": "<...>", "states": ["idle", "walk"] }}
          ],
          "shared_props": [
            {{
              "id": "<prop id, must match objects.json id when present>",
              "name": "<short name>",
              "category": "item | hazard | interactive | decoration",
              "animation_type": "static | loop | trigger",
              "keyframes_id": "<one of {KNOWN_KEYFRAMES}>",
              "states": ["idle"],
              "description": "<one sentence>"
            }}
          ],
          "tile_families": ["<short tile family ids appropriate for the game/biome, e.g. grass, dirt, stone, decoration>"]
        }}
        ```

        animation_type rules:
        - "static": prop has no animation (UI element, ladder, sign post, decorative item that just sits there).
          Generator emits a 1×1 sheet — one frame, one paid call.
        - "loop": prop has a cyclic ambient animation (potion shimmer, key float-glint, flag wave).
          Generator emits a 4×2 (8-frame) sheet using a cyclic keyframe cycle.
        - "trigger": prop has a state-machine activation (spike trap retract→extend, bounce
          spring compress→release, switch off→on). Generator emits a 4×2 sheet using
          a coherent forward+reverse cycle anchored to the SAME visual position so frames
          read as the same prop in different states.

        keyframes_id selection:
        - For "static" props: use "prop_idle" as a placeholder (it's ignored).
        - For "loop" props: prefer per-prop cycles like "gold_key_idle" or "health_potion_idle"
          when the prop matches; fallback to generic "prop_idle".
        - For "trigger" props: prefer per-prop cycles like "spike_trap_trigger" or
          "bounce_spring_trigger" when the prop matches; fallback to generic "trigger" or "bounce".

        Critical:
        - Every prop in objects.json MUST appear in shared_props with the right animation_type.
        - If the brief mentions props not in objects.json, ADD them to shared_props.
        - DO NOT invent characters not in sprites.json. Pass them through.
        - Tile families should reflect the game's biome (forest → grass/dirt/stone; cave → rock/lava;
          space → metal/circuit). Pick 3-5 short ids.

        Respond with ONLY the JSON code block. No commentary.
    """).strip()


def parse_catalog_json(text: str) -> dict:
    s = text.strip()
    fence = re.search(r"```(?:json)?\s*\n(.*?)\n```", s, re.S)
    if fence:
        s = fence.group(1).strip()
    brace = re.search(r"\{.*\}", s, re.S)
    if brace:
        s = brace.group(0)
    try:
        return json.loads(s)
    except Exception as exc:
        raise SystemExit(
            f"decompose_catalog returned unparseable JSON: {exc}\n--- raw ---\n{text}"
        ) from exc


def validate_catalog(cat: dict) -> None:
    if "shared_props" not in cat:
        raise SystemExit("catalog missing 'shared_props'")
    for prop in cat["shared_props"]:
        if "id" not in prop:
            raise SystemExit(f"prop entry missing 'id': {prop}")
        atype = prop.get("animation_type")
        if atype not in VALID_ANIMATION_TYPES:
            raise SystemExit(
                f"prop {prop['id']!r} has invalid animation_type {atype!r}; "
                f"must be one of {VALID_ANIMATION_TYPES}"
            )
        kf = prop.get("keyframes_id")
        if kf and kf not in KNOWN_KEYFRAMES:
            raise SystemExit(
                f"prop {prop['id']!r} has unknown keyframes_id {kf!r}; "
                f"must be one of {KNOWN_KEYFRAMES} (or omit)"
            )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--force", action="store_true",
        help="Regenerate even if assets/catalog.json exists",
    )
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    out_path = project_root / "assets" / "catalog.json"

    if out_path.exists() and not args.force:
        sys.stderr.write(
            f"  catalog.json already exists at {out_path.relative_to(project_root)} — "
            f"pass --force to regenerate\n"
        )
        return 0

    idea_path = project_root / "idea.md"
    if not idea_path.exists():
        raise SystemExit(f"{idea_path} not found")
    idea = idea_path.read_text(encoding="utf-8")

    game_path = project_root / "assets" / "game.json"
    game = json.loads(game_path.read_text(encoding="utf-8")) if game_path.exists() else {}

    sprites_path = project_root / "assets" / "sprites.json"
    sprites = json.loads(sprites_path.read_text(encoding="utf-8")) if sprites_path.exists() else []

    objects: list = []
    for fname in ("objects-shared.json", "objects.json"):
        p = project_root / "assets" / fname
        if p.exists():
            objects = json.loads(p.read_text(encoding="utf-8"))
            break

    prompt = build_prompt(idea, game, sprites, objects)

    backend = active_backend()
    cost = budget.cost_for_image(backend)
    sys.stderr.write(
        f"[catalog] backend={backend} cost={cost}c "
        f"sprites={len(sprites)} objects={len(objects)}\n"
    )

    with budget.charged(
        project_root, cost, f"text-{backend}", note="decompose-catalog"
    ):
        text = generate_text_from_image(prompt, image_paths=[])

    raw_path = project_root / "assets" / "catalog.raw.txt"
    raw_path.write_text(text, encoding="utf-8")

    cat = parse_catalog_json(text)
    validate_catalog(cat)

    out_path.write_text(json.dumps(cat, indent=2) + "\n", encoding="utf-8")
    sys.stderr.write(
        f"  wrote {out_path.relative_to(project_root)} "
        f"({len(cat.get('shared_props', []))} props, "
        f"{len(cat.get('characters', []))} characters, "
        f"{len(cat.get('tile_families', []))} tile families)\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
