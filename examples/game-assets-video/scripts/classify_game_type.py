#!/usr/bin/env python3
"""classify_game_type.py — Pre-flight game classification.

Runs FIRST in the playbook, before any visual-target rendering or asset
generation. Reads `idea.md` (mandatory) and `assets/visual-target.png`
(optional, if it already exists from a prior run), asks the model to
classify the game into one of the supported game types, then merges the
matching template into a per-project `assets/game.json`.

Every downstream task reads game.json to decide which asset categories
to produce / skip and which tilemap-style template to use.

Cost: 1 text-out call (~5¢ via Gemini).

Outputs:
  assets/game.json           machine-readable project manifest
  assets/game.notes.md       human-readable summary (game type, reasoning,
                             keywords) for the user to skim and edit
  assets/game.classifier.raw.txt  raw model response (debug)

Usage:
  python scripts/classify_game_type.py
  python scripts/classify_game_type.py --force   # re-classify even if game.json exists
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import textwrap
from pathlib import Path

from lib import budget
from lib.game import (
    deep_merge,
    list_available_game_types,
    load_game_type_template,
)
from lib.image_api import active_backend
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


def build_classification_prompt(idea_md: str, available_types: list[str]) -> str:
    types_list = "\n".join(f"  - {t}" for t in available_types)
    return textwrap.dedent(f"""\
        You are classifying a 2D game into one of the supported game types
        listed below. Your output drives downstream asset generation —
        picking the wrong type means the playbook will produce assets that
        don't fit the game (e.g. platform-shelf tiles for a top-down RPG).
        Be deliberate.

        Supported game types (pick exactly one):
{types_list}

        Type cheat-sheet:
          - platformer            : side view, jumping between platforms,
                                    floating ledges, vertical exploration.
          - side-scrolling-action : side view, hero walks on a continuous
                                    flat ground, combat and items, no
                                    jumping between platforms (think
                                    classic beat-em-up or 2D action RPG).
          - top-down-rpg          : top-down view (camera looks down),
                                    8-directional movement, tile-based
                                    world, NO parallax background.
          - top-down-shooter      : top-down view, arena combat, walls
                                    and cover, no parallax.
          - vertical-shooter      : top-down view, vertical auto-scroll
                                    (camera moves up while player banks
                                    side to side), bullet-hell shmup.

        Output ONE JSON object, nothing else, in this schema:

        ```json
        {{
          "game_type": "<one of the types above>",
          "confidence": "low | medium | high",
          "reasoning": "<2-3 sentences on why this type fits>",
          "alternatives_considered": ["<other type>", "..."],
          "art_style_keywords": ["<3-6 short style descriptors from the brief>"],
          "anti_keywords": ["<2-4 things the brief says NOT to do, or that contradict the chosen game type>"],
          "movement": ["<list of player movement verbs from the brief, e.g. walk, jump, swim>"]
        }}
        ```

        Game brief (`idea.md`):

        ```
        {idea_md.strip()}
        ```

        Respond with ONLY the JSON code block. No commentary.
    """).strip()


def parse_classifier_json(text: str) -> dict:
    """Strip ```json fences and pull the first {...} object."""
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
        raise SystemExit(f"classifier returned unparseable JSON: {exc}\n--- raw ---\n{text}") from exc


def merge_project_into_template(template: dict, classifier_output: dict, sources: list[str]) -> dict:
    """Layer the AI's project-specific keywords / movement / etc. on top of
    the static template defaults. The template owns asset_categories +
    playbook_overrides; the classifier owns the human-readable narrative
    (reasoning, anti-keywords) plus art_style_keywords and movement.
    """
    project_overrides = {
        "art_style_keywords": classifier_output.get("art_style_keywords") or template.get("art_style_keywords") or [],
        "anti_keywords": classifier_output.get("anti_keywords") or template.get("anti_keywords") or [],
        "movement": classifier_output.get("movement") or template.get("movement") or [],
        "_classifier_metadata": {
            "source": " + ".join(sources),
            "confidence": classifier_output.get("confidence") or "unknown",
            "reasoning": classifier_output.get("reasoning") or "",
            "alternatives_considered": classifier_output.get("alternatives_considered") or [],
        },
    }
    return deep_merge(template, project_overrides)


def write_notes_md(game: dict, out_path: Path) -> None:
    meta = game.get("_classifier_metadata") or {}
    cats = game.get("asset_categories") or {}
    enabled = [k for k, v in cats.items() if (v or {}).get("enabled", True)]
    disabled = [k for k, v in cats.items() if not (v or {}).get("enabled", True)]
    body = textwrap.dedent(f"""\
        # Game manifest — `{game.get("game_type")}`

        **View:** {game.get("view")}
        **Movement:** {", ".join(game.get("movement") or []) or "—"}
        **Confidence:** {meta.get("confidence", "?")}
        **Source:** {meta.get("source", "?")}

        ## Reasoning

        {meta.get("reasoning") or "(none)"}

        ## Asset categories

        - **Enabled:** {", ".join(enabled) or "(none)"}
        - **Disabled / skipped:** {", ".join(disabled) or "(none)"}

        ## Style keywords

        - {chr(10).join(f"- {kw}" for kw in (game.get("art_style_keywords") or [])) or "—"}

        ## Anti-keywords (avoid these)

        - {chr(10).join(f"- {kw}" for kw in (game.get("anti_keywords") or [])) or "—"}

        ---

        _Edit `assets/game.json` to override any field. Re-run the playbook
        and downstream tasks will pick up the new manifest._
    """).strip()
    out_path.write_text(body + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--force", action="store_true",
                    help="Re-classify even if assets/game.json already exists")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    out_json = project_root / "assets" / "game.json"
    out_notes = project_root / "assets" / "game.notes.md"
    out_raw = project_root / "assets" / "game.classifier.raw.txt"

    if out_json.exists() and not args.force:
        sys.stderr.write(
            f"  game.json already exists at {out_json.relative_to(project_root)} — "
            f"pass --force to re-classify\n"
        )
        return 0

    idea_path = project_root / "idea.md"
    if not idea_path.exists():
        raise SystemExit(f"{idea_path} not found")
    idea_md = idea_path.read_text(encoding="utf-8")

    available = list_available_game_types(project_root)
    if not available:
        raise SystemExit(
            f"no game-type templates found under "
            f"{project_root}/.converge/playbooks/default/game-types/"
        )

    # Optional vision input — visual-target.png if it exists from a
    # prior run. Otherwise we classify from the brief alone.
    vt_path = project_root / "assets" / "visual-target.png"
    image_paths: list[Path] = []
    sources = ["idea.md"]
    if vt_path.exists():
        image_paths.append(vt_path)
        sources.append("visual-target.png")

    prompt = build_classification_prompt(idea_md, available)

    backend = active_backend()
    cost = budget.cost_for_image(backend)
    sys.stderr.write(
        f"[classify-game] backend={backend} cost={cost}¢ "
        f"sources={sources}\n"
    )
    with budget.charged(
        project_root, cost, f"text-{backend}",
        note="classify-game-type",
    ):
        text = generate_text_from_image(prompt, image_paths=image_paths)

    out_raw.parent.mkdir(parents=True, exist_ok=True)
    out_raw.write_text(text, encoding="utf-8")

    parsed = parse_classifier_json(text)
    chosen = parsed.get("game_type")
    if chosen not in available:
        raise SystemExit(
            f"classifier returned unsupported game_type {chosen!r}. "
            f"Available: {available}. Edit prompt or add a template."
        )

    template = load_game_type_template(project_root, chosen)
    merged = merge_project_into_template(template, parsed, sources)

    out_json.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    write_notes_md(merged, out_notes)

    sys.stderr.write(
        f"  classified as: {chosen} (confidence={parsed.get('confidence')})\n"
        f"  wrote {out_json.relative_to(project_root)}\n"
        f"  wrote {out_notes.relative_to(project_root)}\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
