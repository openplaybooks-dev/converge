# Task: 00-classify-game

# 00-classify-game — Game-type manifest

The **first** task in the playbook. Every subsequent task reads `assets/game.json` to decide:

- which asset categories to produce vs skip
- which tilemap variant template to use (platform-shelves vs continuous-ground vs 8-direction-rpg)
- how many parallax bg layers, if any
- whether the inspect viewer should render floating platforms or a continuous ground

Without this manifest the playbook would have to assume a "platformer" template, which produces wrong assets for top-down RPGs, side-scrolling action games, shmups, etc.

## How it works

```bash
python3 scripts/classify_game_type.py
```

1. Reads `idea.md` (mandatory) and `assets/visual-target.png` (optional, used as additional context if it already exists from a prior run).
2. Calls Gemini text-out asking the model to classify the game into one of the supported types and emit a JSON block with `game_type`, `confidence`, `reasoning`, `art_style_keywords`, `anti_keywords`, `movement`.
3. Loads the matching template from `.converge/playbooks/default/game-types/<type>.json`.
4. Merges the AI's project-specific fields into the template.
5. Writes `assets/game.json` (machine-readable manifest) and `assets/game.notes.md` (human-readable summary).

## Supported game types

- `platformer` — side view, jumping between platforms, vertical exploration
- `side-scrolling-action` — side view, continuous flat ground, combat-focused (no jumping)
- `top-down-rpg` — top-down camera, 8-directional movement, tile-based, NO parallax
- `top-down-shooter` — top-down arena combat with walls and cover
- `vertical-shooter` — vertical auto-scroll shmup

## Override / opt out

If you want to skip the classifier and hand-author `assets/game.json` directly, just write the file before this task runs. The script bails early if `assets/game.json` already exists; pass `--force` to re-classify. Editing `assets/game.json` after this task ran always wins — every downstream task re-reads it.

## Cost

- 1 text-out call (~5¢ on Gemini)

## Outputs

- `assets/game.json` — machine-readable, drives downstream tasks
- `assets/game.notes.md` — human-readable summary with reasoning + keywords
- `assets/game.classifier.raw.txt` — raw model response (debug sidecar)