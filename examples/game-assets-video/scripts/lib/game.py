"""game.py — read assets/game.json and answer "what does this game need?".

The game manifest is the project-wide source of truth for game-type +
asset-category configuration. It's generated at the start of the playbook
by `scripts/classify_game_type.py` (or hand-authored), and every
downstream generator script reads it via these helpers to decide:

  - which asset categories to produce vs skip
  - which tilemap variant template to use (platform-shelves vs
    continuous-ground vs 8-direction-rpg etc.)
  - how many parallax bg layers, if any
  - whether the inspect viewer should render floating platforms

Schema in `.converge/playbooks/default/game-types/<type>.json` defines the
defaults for each game type; per-project `assets/game.json` may override
or extend any field.

Example:

    from lib.game import load_game_manifest, is_category_enabled

    game = load_game_manifest(project_root)
    if not is_category_enabled(game, "background"):
        return  # nothing to do for top-down RPGs

Falls back to a platformer default when game.json is missing — preserves
backward compatibility with projects authored before this manifest existed.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


# ── Paths ──────────────────────────────────────────────────────────────────

GAME_JSON_PATH = "assets/game.json"
TEMPLATES_SUBDIR = ".converge/playbooks/default/game-types"


# ── Loading + fallback ─────────────────────────────────────────────────────

def load_game_manifest(project_root: Path) -> dict:
    """Read assets/game.json. Returns a platformer default if missing,
    so existing projects work without an explicit manifest."""
    p = project_root / GAME_JSON_PATH
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            # Corrupt manifest: surface a sensible fallback rather than crash.
            pass
    return _default_platformer()


def load_game_type_template(project_root: Path, game_type: str) -> dict:
    """Read .converge/playbooks/default/game-types/<game_type>.json."""
    p = project_root / TEMPLATES_SUBDIR / f"{game_type}.json"
    if not p.exists():
        raise FileNotFoundError(
            f"game-type template '{game_type}' not found at {p}. "
            f"Available templates: {list_available_game_types(project_root)}"
        )
    return json.loads(p.read_text(encoding="utf-8"))


def list_available_game_types(project_root: Path) -> list[str]:
    """Return the game-type names available as templates (filenames stem-matched)."""
    d = project_root / TEMPLATES_SUBDIR
    if not d.exists():
        return []
    return sorted(p.stem for p in d.glob("*.json"))


def _default_platformer() -> dict:
    """Backward-compat fallback: matches what the playbook hard-coded
    before assets/game.json existed."""
    return {
        "$schema": "v1",
        "game_type": "platformer",
        "view": "side-2d",
        "movement": ["walk-left", "walk-right", "jump"],
        "art_style_keywords": [],
        "anti_keywords": [],
        "asset_categories": {
            "characters":   {"enabled": True, "frames_mode": "video", "default_states": ["idle", "walk"]},
            "shared_props": {"enabled": True, "categories": ["item", "hazard", "interactive"]},
            "tilemap":      {"enabled": True, "style": "platform-shelves", "tile_dimensions": [16, 16], "default_variants": []},
            "background":   {"enabled": True, "layers": ["far", "mid", "near"], "transparent_layers": ["mid", "near"]},
            "scene_props":  {"enabled": True, "categories": ["item", "decoration"]},
        },
        "playbook_overrides": {
            "scenes_inspect_use_platforms": True,
            "world_width_tiles": 200,
            "canvas_tiles_tall": 12,
        },
        "_classifier_metadata": {"source": "default-fallback", "confidence": "low"},
    }


# ── Query helpers (used by every downstream script) ───────────────────────

def is_category_enabled(game: dict, category: str) -> bool:
    """Returns True if `asset_categories[<category>].enabled` is True (or
    missing — default-on for backward-compat).

    `category` is one of: characters, shared_props, tilemap, background, scene_props.
    """
    cat = (game.get("asset_categories") or {}).get(category)
    if cat is None:
        return True  # backward-compat: missing entry = enabled
    return bool(cat.get("enabled", True))


def get_category(game: dict, category: str) -> dict:
    """Return the full category config block (`asset_categories[<category>]`),
    or {} if not present."""
    return (game.get("asset_categories") or {}).get(category) or {}


def tilemap_template(game: dict) -> dict:
    return get_category(game, "tilemap")


def background_layers(game: dict) -> list[str]:
    """Layer ids ('far', 'mid', 'near') for parallax bgs. Empty list if
    background category is disabled or has no layers (top-down RPG)."""
    bg = get_category(game, "background")
    if not bg.get("enabled", True):
        return []
    return list(bg.get("layers") or [])


def transparent_bg_layers(game: dict) -> set[str]:
    bg = get_category(game, "background")
    return set(bg.get("transparent_layers") or [])


def subject_height_tiles_for_layer(game: dict, layer_id: str) -> float | None:
    bg = get_category(game, "background")
    sh = bg.get("subject_height_tiles") or {}
    val = sh.get(layer_id)
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def playbook_override(game: dict, key: str, default: Any = None) -> Any:
    """Read a single key from playbook_overrides. Used by the inspect
    viewer (`scenes_inspect_use_platforms`) and world sizing."""
    return (game.get("playbook_overrides") or {}).get(key, default)


def game_type(game: dict) -> str:
    return str(game.get("game_type") or "platformer")


def view_mode(game: dict) -> str:
    """side-2d | top-down-2d | isometric"""
    return str(game.get("view") or "side-2d")


# ── Camera spec ───────────────────────────────────────────────────────────

DEFAULT_CAMERA_DESCRIPTION = (
    "Side-scroller camera tilted ~30° down from horizontal "
    "(~120° from straight-up) and pushed slightly forward of the subject. "
    "Every painted concept reads with a hint of dimensionality from this "
    "angle: a visible top surface PLUS a visible side face. Grounds and "
    "platforms show a top surface with a body falling away below it "
    "(cartoon-platformer chunk of land, NOT a thin cross-section strip). "
    "Trees, rocks, pickups all sit at this slight 3/4-perspective angle. "
    "This camera is the binding visual contract for the project — every "
    "generator must honor it for cross-asset consistency."
)


def get_camera_spec(game: dict) -> dict:
    """Return the project's camera config, falling back to the default
    side-scroller spec when `camera:` is absent or partial.

    Generators inject `description` into their prompt under a CAMERA
    section so every painted asset honors the same viewing angle.
    """
    cam = game.get("camera") or {}
    return {
        "view": cam.get("view", "side-scroller-perspective"),
        "tilt_deg": cam.get("tilt_deg", 30),
        "forward_offset_tiles": cam.get("forward_offset_tiles", 2),
        "description": cam.get("description") or DEFAULT_CAMERA_DESCRIPTION,
    }


# ── Merge utility for classifier ──────────────────────────────────────────

def deep_merge(base: dict, override: dict) -> dict:
    """Recursive dict merge. Lists in `override` REPLACE lists in `base`
    (we don't try to be clever about per-element merging — game-type
    templates carry sane defaults and overrides are project-specific
    replacements).

    Used by the classifier to merge AI output into a template:

        merged = deep_merge(template, classifier_output)
    """
    out = dict(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out
