#!/usr/bin/env python3
"""author_tokens.py — AI authors per-biome token libraries.

For each biome declared in `assets/game.json` whose
`assets/tokens/{biome}/index.json` does not yet exist:

  1. Read idea.md, ART_BIBLE.md, assets/tokens/SCHEMA.md, and any existing
     grassland exemplars as in-context examples.
  2. Call AI to produce 15-30 tokens: each with frontmatter (id,
     biome, category, body, layers, gameplay, visual, sketch) and a
     small SVG sketch.
  3. Write `assets/tokens/{biome}/{category-folder}/{id}.md` +
     `assets/tokens/{biome}/{category-folder}/{id}.sketch.svg` for every token.
  4. Run `tokens_compile.py` to validate and emit `index.json`.

Pattern matches scripts/generate_art_bible.py — text-only AI call via
`lib.image_api_gemini.generate_text_from_image`, cost-gated through
`lib.budget.charged`.

Usage:
  python scripts/author_tokens.py                  # all biomes
  python scripts/author_tokens.py grassland        # one biome
  python scripts/author_tokens.py --force          # re-author even if index.json exists
  python scripts/author_tokens.py --dry-run        # write the prompt to stderr, skip AI
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

from lib import budget
from lib.image_api import active_backend
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


# category enum value -> on-disk subfolder name (must match tokens_compile.py)
CATEGORY_TO_FOLDER = {
    "ground": "ground",
    "platform": "platforms",
    "hazard": "hazards",
    "decoration": "decorations",
    "background": "background",
    "marker": "markers",
}


PROMPT_TEMPLATE = """\
You are authoring a token library for biome `{biome}` in a 2D
side-scrolling game. The library is the building-block vocabulary
every scene composes from. Each token is a named, reusable
visual + gameplay primitive.

You have read:
  - assets/tokens/SCHEMA.md (the file format spec — bind to this exactly)
  - assets/tokens/TOKENS_SPEC.md (principles — read this first)
  - assets/ART_BIBLE.md (game-wide visual rules)
  - idea.md (the game brief)
{exemplar_section}
Author 15-30 tokens for biome `{biome}` covering these categories:

  Ground (4-6 tokens):
    Flat ground in widths 3, 5, 10, 15 cells; bumpy/sloped variants.

  Hazards (3-5 tokens):
    Pond / pit / damaging surface in widths 3, 5, 8 cells.

  Platforms (3-5 tokens):
    Floating platforms in widths 3, 4, 5, 7 cells; multi-tier.

  Background (3-6 tokens):
    Tree clusters at varied heights, distant mountains/silhouettes,
    biome-defining scenery.

  Decoration (1-3 tokens):
    Small accents (rocks, flowers, debris) — optional, contribute
    visual richness without gameplay impact.

  Markers (2 tokens):
    spawn-marker, exit-marker (gameplay-only, 1x1 footprint).

OUTPUT FORMAT — exactly this structure, nothing else:

Return a JSON array. Each entry is one token. Schema:

```json
[
  {{
    "id": "kebab-case-unique-id",
    "frontmatter_yaml": "---\\nid: ...\\nbiome: {biome}\\ncategory: ...\\nbody:\\n  footprint: {{ width: N, height: N }}\\n  anchor: bottom-left\\nlayers: [play]   # or [bg-far], [bg-mid], [fg]\\ngameplay:\\n  passable: false\\n  damage: 0\\n  beats: []\\nvisual:\\n  symbol: \\"X\\"\\n  fill: \\"#RRGGBB\\"\\n  material: \\"...\\"\\n  detail_density: medium\\n  art_notes: |\\n    multi-line painter notes\\nsketch:\\n  file: concept.png\\n  size_px: [W, H]\\n---\\n"
  }},
  ...
]
```

CRITICAL CONSTRAINTS:
- `id` must be unique within the array. Kebab-case.
- `category` must be one of: ground, hazard, platform, decoration, background, marker.
- `body.anchor` must be one of: bottom-left, top-left, center.
- `layers` must be a non-empty list of: bg-far, bg-mid, play, fg.
  - ground/hazard/platform/marker → [play]
  - decoration → [play] or [bg-mid] or [fg]
  - background → [bg-far] or [bg-mid]
- `body.footprint.width` and `.height` must be positive integers (in
  concept-tile units). Most ground = 1 high; trees = 3-6 high;
  mountains = 4-8 high.
- `visual.symbol` is one ASCII char that represents the token on
  layer mapping grids. Layer-scoped uniqueness: no two tokens that
  share an eligible layer can use the same symbol.
- `visual.fill` must be `#RRGGBB` (6 hex digits).
- `visual.detail_density` must be one of: low, medium, high.
- `sketch.file` MUST be exactly `concept.png` (the painted concept lives
  inside the token's per-asset folder, sibling to `token.md`).
  The PNG is rendered separately by `scripts/generate_token_concepts.py`
  using the project's art-style anchors. You only emit the MD; the PNG
  is generated for you.
- `sketch.size_px` is the eventual concept image's dimensions: long side
  1024 px, short side scaled by footprint aspect (a 5x1 token →
  [1024, 205]; a 3x4 tree → [768, 1024]; a 1x1 marker → [1024, 1024]).
  Compute it: if width >= height, [1024, round(1024 * height/width)];
  else [round(1024 * width/height), 1024]; floor short side at 256.
- DO NOT emit a `sketch_svg` field — concept images are painted by
  the image-gen step, not authored as SVG primitives.

Return ONLY the JSON array. No preamble, no explanation, no code
fences around the whole thing. The first character of your output
must be `[`.

idea.md:
{idea}

ART_BIBLE.md:
{art_bible}

assets/tokens/TOKENS_SPEC.md (principles — read this first):
{tokens_spec}

assets/tokens/SCHEMA.md (file format reference):
{schema}
"""


EXEMPLAR_HEADER = """\
  - assets/tokens/grassland/{{ground,platforms,hazards,decorations,background,markers}}/*.md
    (existing exemplars for the grassland biome — match their style and
    structure exactly; note that each token lives in the subfolder named
    after its category)

In-context exemplars (study the field shape, the categories
covered, the sketch granularity, the SVG primitive style):
"""


def load_exemplars(project_root: Path) -> str:
    """Load the existing grassland tokens (recursively, across category folders)
    as in-context examples."""
    grassland_dir = project_root / "assets" / "tokens" / "grassland"
    if not grassland_dir.is_dir():
        return ""
    parts: list[str] = [EXEMPLAR_HEADER]
    # Per-asset folder layout: each token MD is `{category}/{id}/token.md`.
    for md in sorted(grassland_dir.rglob("token.md")):
        parts.append(f"\n### {md.relative_to(project_root)}\n```markdown\n{md.read_text()}\n```")
    return "\n".join(parts)


def discover_biomes(project_root: Path) -> list[str]:
    """Return the list of biomes the game uses."""
    game_path = project_root / "assets" / "game.json"
    if not game_path.exists():
        tm_path = project_root / "assets" / "tile_maps.json"
        if tm_path.exists():
            tm = json.loads(tm_path.read_text())
            if isinstance(tm, list) and tm:
                return [str(t.get("id") or t.get("terrain") or "default") for t in tm]
        return ["grassland"]

    game = json.loads(game_path.read_text())
    biomes = game.get("biomes")
    if isinstance(biomes, list) and biomes:
        return [str(b) if isinstance(b, str) else str(b.get("id")) for b in biomes]
    tm = game.get("asset_categories", {}).get("tilemap", {}).get("variants", [])
    if tm:
        return [str(t.get("id") or t) for t in tm]
    return ["grassland"]


def parse_ai_response(raw: str) -> list[dict[str, Any]]:
    """Strip code fences if present and parse JSON."""
    txt = raw.strip()
    if txt.startswith("```"):
        lines = txt.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        txt = "\n".join(lines)
    return json.loads(txt)


_CATEGORY_RE = re.compile(r"^\s*category\s*:\s*([A-Za-z_-]+)\s*$", re.MULTILINE)


def _extract_category(frontmatter_yaml: str) -> str | None:
    m = _CATEGORY_RE.search(frontmatter_yaml)
    return m.group(1).strip() if m else None


def write_token(biome_dir: Path, token: dict[str, Any]) -> None:
    """Write one token's MD into its category subfolder. The PNG concept
    image is rendered later by `generate_token_concepts.py`."""
    tid = token["id"]
    md_body = token["frontmatter_yaml"]
    if not md_body.endswith("\n"):
        md_body += "\n"

    category = _extract_category(md_body)
    if category is None or category not in CATEGORY_TO_FOLDER:
        raise ValueError(
            f"token '{tid}' frontmatter is missing a valid `category:` field "
            f"(got {category!r}); cannot pick a destination folder."
        )
    # Per-asset folder layout: each token lives in its own folder named
    # after its id, with `token.md` inside. The compiled token.json and
    # generated concept.png/prompt.txt/seed.txt sit alongside.
    asset_dir = biome_dir / CATEGORY_TO_FOLDER[category] / tid
    asset_dir.mkdir(parents=True, exist_ok=True)

    md_path = asset_dir / "token.md"
    md_path.write_text(md_body, encoding="utf-8")


def author_biome(
    biome: str,
    project_root: Path,
    *,
    force: bool,
    dry_run: bool,
) -> bool:
    """Return True if the biome was authored (or already cached + skipped)."""
    biome_dir = project_root / "assets" / "tokens" / biome
    index_path = biome_dir / "index.json"
    if index_path.exists() and not force:
        print(f"  [{biome}] skip (index.json already exists, use --force to re-author)", file=sys.stderr)
        return True

    biome_dir.mkdir(parents=True, exist_ok=True)

    schema = (project_root / "assets" / "tokens" / "SCHEMA.md").read_text(encoding="utf-8")
    spec_path = project_root / "assets" / "tokens" / "TOKENS_SPEC.md"
    tokens_spec = spec_path.read_text(encoding="utf-8") if spec_path.exists() else "(TOKENS_SPEC.md not present — see SCHEMA.md for format)"
    idea = (project_root / "idea.md").read_text(encoding="utf-8").strip()
    art_bible_path = project_root / "assets" / "ART_BIBLE.md"
    art_bible = art_bible_path.read_text(encoding="utf-8") if art_bible_path.exists() else "(not yet generated)"
    exemplars = load_exemplars(project_root)
    exemplar_section = (exemplars + "\n") if exemplars else ""

    prompt = PROMPT_TEMPLATE.format(
        biome=biome,
        idea=idea,
        art_bible=art_bible,
        schema=schema,
        tokens_spec=tokens_spec,
        exemplar_section=exemplar_section,
    )

    if dry_run:
        print(f"\n--- author_tokens DRY-RUN for biome '{biome}' ({len(prompt)} chars) ---", file=sys.stderr)
        print(prompt[:2000] + ("\n...[truncated]" if len(prompt) > 2000 else ""), file=sys.stderr)
        return True

    backend = active_backend()
    cost = budget.cost_for_image(backend)
    print(f"  [{biome}] authoring via {backend}, cost={cost}¢", file=sys.stderr)

    with budget.charged(project_root, cost, f"text-{backend}", note=f"assets/tokens/{biome} authoring"):
        raw = generate_text_from_image(prompt, image_paths=None)

    try:
        tokens = parse_ai_response(raw)
    except json.JSONDecodeError as e:
        print(f"  [{biome}] ERROR: AI did not return valid JSON: {e}", file=sys.stderr)
        (biome_dir / "_raw.txt").write_text(raw, encoding="utf-8")
        print(f"  raw response saved to {biome_dir / '_raw.txt'}", file=sys.stderr)
        return False

    if not isinstance(tokens, list) or not tokens:
        print(f"  [{biome}] ERROR: AI returned non-list or empty: {type(tokens).__name__}", file=sys.stderr)
        return False

    print(f"  [{biome}] AI produced {len(tokens)} tokens", file=sys.stderr)

    written = 0
    failed: list[str] = []
    for token in tokens:
        try:
            write_token(biome_dir, token)
            written += 1
        except Exception as e:
            failed.append(f"{token.get('id', '?')}: {e}")

    if failed:
        print(f"  [{biome}] {len(failed)} token(s) failed to write:", file=sys.stderr)
        for f in failed:
            print(f"    - {f}", file=sys.stderr)

    print(f"  [{biome}] wrote {written}/{len(tokens)} tokens to {biome_dir.relative_to(project_root)}", file=sys.stderr)

    # Render painted PNG concepts for every token. The compiler's PNG
    # validator requires these, so this MUST run before tokens_compile.
    # Each token call goes through lib.budget.charged inside the script.
    print(f"  [{biome}] running generate_token_concepts.py {biome}...", file=sys.stderr)
    rc = subprocess.run(
        [sys.executable, "scripts/generate_token_concepts.py", biome],
        cwd=project_root,
    ).returncode
    if rc != 0:
        print(f"  [{biome}] WARNING: generate_token_concepts.py returned {rc}", file=sys.stderr)
        return False

    print(f"  [{biome}] running tokens_compile.py {biome}...", file=sys.stderr)
    rc = subprocess.run(
        [sys.executable, "scripts/tokens_compile.py", biome],
        cwd=project_root,
    ).returncode
    if rc != 0:
        print(f"  [{biome}] WARNING: tokens_compile.py returned {rc}", file=sys.stderr)
        return False

    return written > 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("biome", nargs="?", help="biome name; omit to author every biome in game.json")
    ap.add_argument("--force", action="store_true", help="re-author even if index.json exists")
    ap.add_argument("--dry-run", action="store_true", help="print the prompt, skip the AI call")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    if args.biome:
        targets = [args.biome]
    else:
        targets = discover_biomes(project_root)

    print(f"author_tokens: {len(targets)} biome(s): {targets}", file=sys.stderr)

    ok = 0
    fail = 0
    for biome in targets:
        try:
            if author_biome(biome, project_root, force=args.force, dry_run=args.dry_run):
                ok += 1
            else:
                fail += 1
        except SystemExit:
            raise
        except Exception as e:
            print(f"  [{biome}] EXCEPTION: {e}", file=sys.stderr)
            fail += 1

    print(f"\nauthor_tokens: {ok} ok, {fail} failed", file=sys.stderr)
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
