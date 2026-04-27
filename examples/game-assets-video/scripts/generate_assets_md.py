#!/usr/bin/env python3
"""generate_assets_md.py — Derive an ASSETS.md asset manifest from idea.md + visual-target.png.

Adapted from godogen's `asset-planner.md`. Sends the visual-target screenshot
and the game brief to Gemini text, asks for a structured 5-column table
listing every distinct asset visible. Mandatory `Size` column is enforced —
without intended display dimensions, downstream scene-builders consistently
scale things wrong.

Usage:
  python scripts/generate_assets_md.py

Outputs:
  ASSETS.md  — at the project root
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from lib import budget
from lib.image_api import active_backend
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


PROMPT = """\
Analyze the attached game screenshot and the brief below. Produce an ASSETS.md document listing every distinct asset visible in the screenshot.

Output format — exactly this schema, nothing else:

```markdown
# Assets

**Art direction:** <one sentence describing the art style>

## Characters

| ID | Description | Size | Animation states | Notes |
|----|-------------|------|------------------|-------|
| hero-knight | Cute armored knight | 128x128 px | idle, walk | Player. Faces right. |
...

## Props

| ID | Description | Size | Animation states | Notes |
|----|-------------|------|------------------|-------|
| coin | Spinning gold coin | 32x32 px | idle | Collectible |
...

## Backgrounds

| ID | Description | Size | Notes |
|----|-------------|------|-------|
| forest_bg | Distant parallax forest | 1920x1080 | Furthest layer |
...

## Tile maps

| ID | Description | Tile size | Notes |
|----|-------------|-----------|-------|
| grassland | Grass + dirt platform tiles | 32x32 px | Used for ground + platforms |
```

Rules (HARD):
- Every row MUST have a Size column. Sprites: pixel display size (e.g. `128x128 px`). Backgrounds: pixel canvas size (e.g. `1920x1080`). Tile maps: tile size (`32x32 px`).
- One row per distinct asset visible. Don't invent assets that aren't in the screenshot.
- IDs are kebab-case, alphanumeric.
- If a section has no rows, omit the table and write "_None._" under the heading.
- Animation states default to ["idle"] for any character / animated prop unless the brief implies more.
- Output the markdown ONLY — no preamble, no explanation, no code fences around the whole thing.

Game brief:
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default="ASSETS.md")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    idea_path = project_root / "idea.md"
    visual_target = project_root / "assets" / "visual-target.png"

    if not idea_path.exists():
        raise SystemExit(f"idea.md not found at {idea_path}")
    if not visual_target.exists():
        raise SystemExit(
            f"visual-target.png not found at {visual_target}\n"
            f"Run first: python scripts/generate_visual_target.py"
        )

    idea = idea_path.read_text(encoding="utf-8")
    full_prompt = PROMPT + idea.strip()

    backend = active_backend()
    cost = budget.cost_for_image(backend)  # text gen is cheaper but we charge image-rate as a conservative proxy

    print(
        f"[planner] generating ASSETS.md from idea.md + visual-target.png  backend={backend} cost={cost}¢",
        file=sys.stderr,
    )

    with budget.charged(project_root, cost, f"text-{backend}", note="ASSETS.md generation"):
        md = generate_text_from_image(full_prompt, image_paths=[visual_target])

    # Strip surrounding code fences if the model wrapped its output.
    if md.startswith("```"):
        # Drop first line + closing ```
        md_lines = md.splitlines()
        if md_lines[0].startswith("```"):
            md_lines = md_lines[1:]
        if md_lines and md_lines[-1].startswith("```"):
            md_lines = md_lines[:-1]
        md = "\n".join(md_lines)

    out_path = project_root / args.out
    out_path.write_text(md.strip() + "\n", encoding="utf-8")
    print(f"  wrote {out_path.relative_to(project_root)} ({len(md)} chars)", file=sys.stderr)

    # Quick lint: every table row should have Size in column 3-ish.
    missing = []
    for i, line in enumerate(md.splitlines(), 1):
        if line.startswith("|") and not line.lstrip("|").lstrip().startswith("-"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) >= 3 and cells[0].lower() not in ("id", "name", ""):
                size = cells[2]
                if not size or size.lower() == "size":
                    continue
                if not any(ch.isdigit() for ch in size):
                    missing.append(f"line {i}: {line.strip()}")
    if missing:
        sys.stderr.write("  ⚠ Some rows have non-numeric Size values:\n")
        for m in missing[:5]:
            sys.stderr.write(f"    {m}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
