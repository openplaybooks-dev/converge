#!/usr/bin/env python3
"""generate_visual_target.py — Render a "what the finished game looks like" reference screenshot.

Adapted from godogen's `visual-target.md` skill. Reads `idea.md`, builds the
godogen prompt template (enumerate every game object, exclude what you won't
build, show HUD elements), calls Gemini image-gen, writes
`assets/visual-target.png` + `assets/visual-target.prompt.txt`.

This screenshot is the visual QA target that downstream planning consumes:
every distinct object visible here becomes an asset requirement.

Usage:
  python scripts/generate_visual_target.py [--seed N] [--aspect 16:9]

Outputs:
  assets/visual-target.png         — 1024×<height> reference render
  assets/visual-target.prompt.txt  — full prompt sent to the model
  assets/visual-target.seed.txt    — seed used
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from lib import budget
from lib.art_styles import get_preset
from lib.image_api import generate_image, active_backend
from lib.sprite import find_project_root


PROMPT_RULES = """
Prompt rules (from godogen visual-target):
- Enumerate every game object (player, each enemy type, obstacles, collectibles, projectiles, props). Every object here becomes an asset requirement; objects absent from the reference get forgotten downstream.
- Reflect real technical constraints. Sprites are separate layers, so show them as distinct objects against the background — not composited photorealism.
- DO NOT prompt downgraded quality (no "lowpoly", "pixel art", "retro"). Prompt clean sharp digital rendering instead.
- Focus on the most important gameplay moment — the frame that best shows spatial layout, core mechanic, camera perspective.
- Exclude what you won't build: volumetric lighting, motion blur, depth of field, atmospheric fog, complex reflections, lens flares, detailed cast shadows.
- Show HUD/UI: health bar, score counter, minimap, inventory slots — every UI element with screen position.
"""


def build_prompt(idea: str, art_style: str | None) -> str:
    preset = get_preset(art_style)
    return f"""Screenshot of a 2D side-scrolling video game taken mid-gameplay. Camera: orthographic, side view, character roughly centered horizontally, ground line near bottom third of screen.

Game brief:
{idea.strip()}

Composition rules:
- Show the player character clearly visible in their default pose, full body, sized to about 1/8 of the screen height.
- Place 1-3 representative enemies / NPCs at typical encounter positions (mid-screen and screen-edge).
- Show 1-2 collectibles or pickups in their natural locations.
- Include obstacles or interactive props if the brief mentions them.
- Background: layered parallax (sky / distant / mid). Foreground: ground tiling visible.
- HUD: health bar top-left, score counter top-right, optional inventory slot bottom-center. Every UI element shown at its screen position with placeholder values.

ART STYLE (mandatory): {preset['style_description']}

Clean, sharp digital rendering. Game-engine output, not concept art. Every distinct object shown here will become an asset to generate downstream — don't include effects we can't produce (no volumetric light, no motion blur, no lens flare, no detailed cast shadows).

This is the visual QA target. Spatial layout, scale relationships, and stylistic choices baked in here become requirements for every asset generated downstream.
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--aspect", default="16:9", choices=["16:9", "1:1", "21:9", "4:3", "9:16"])
    ap.add_argument("--art-style", default=None, help="Override art-style preset (default: project preset)")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    idea_path = project_root / "idea.md"
    if not idea_path.exists():
        raise SystemExit(f"idea.md not found at {idea_path}. Write a one-paragraph game brief there first.")
    idea = idea_path.read_text(encoding="utf-8")

    prompt = build_prompt(idea, args.art_style)

    out_dir = project_root / "assets"
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / "visual-target.png"
    prompt_path = out_dir / "visual-target.prompt.txt"
    seed_path = out_dir / "visual-target.seed.txt"

    prompt_path.write_text(prompt + "\n\n---\n" + PROMPT_RULES, encoding="utf-8")

    backend = active_backend()
    cost = budget.cost_for_image(backend)

    print(
        f"[visual-target] generating {args.aspect} reference at 1024×… backend={backend} cost={cost}¢",
        file=sys.stderr,
    )

    with budget.charged(project_root, cost, f"image-{backend}", note="visual-target"):
        img_bytes, seed_used = generate_image(
            prompt,
            reference_paths=None,
            seed=args.seed,
            aspect_ratio=args.aspect,
            resolution=1024,
        )
    png_path.write_bytes(img_bytes)
    seed_path.write_text(str(seed_used), encoding="utf-8")

    print(f"  wrote {png_path.relative_to(project_root)} (seed={seed_used})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
