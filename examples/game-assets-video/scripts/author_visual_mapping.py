#!/usr/bin/env python3
"""author_visual_mapping.py — AI authors visual_mapping.md + mappings/*.md.

Per-scene MD-first authoring. Replaces the older single-file format
with a manifest + per-sub-layer grid files. The compiler
(visual_mapping_compile.py) reads them and emits scene.assembly.json
which the rest of the pipeline consumes.

For a given scene_id (declared in `assets/scenes.json`), if
`assets/scenes/{scene_id}/visual_mapping.md` does not yet exist:

  1. Read idea.md, the scene entry from scenes.json, ART_BIBLE.md,
     assets/tokens/{biome}/index.json (token list with symbols),
     assets/assets/tokens/TOKENS_SPEC.md (principles), and the demo-grassland
     mappings as in-context exemplars.
  2. Call AI to produce a multi-file response: a manifest
     visual_mapping.md plus one mappings/{sub-layer}.md per layer.
     Each sub-layer file has YAML frontmatter + a ```map ASCII grid
     + an optional ```yaml beats block.
  3. Validate by running visual_mapping_compile.py {scene_id} --check.
     Retry once on failure with the compiler's errors fed back into
     the prompt.
  4. Write the files to disk.

Skips any scene whose visual_mapping.md already exists (protects
hand-curated scenes like demo-grassland). Use --force to override.

Cost-gated via lib.budget.charged. One AI text call per scene; one
retry on validation failure.

Usage:
  python scripts/author_visual_mapping.py forest-tutorial
  python scripts/author_visual_mapping.py forest-tutorial --dry-run
  python scripts/author_visual_mapping.py             # all scenes
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
from lib.style_anchor import landscape_path


# Multi-file response format: each file fenced as
#   ===file: <relpath> ===
#   <file body>
#   ===endfile===
# The script splits on these markers and writes each block as a
# separate file under the scene directory.
FILE_BEGIN_RE = re.compile(r"^===file:\s*(?P<path>\S+)\s*===\s*$", re.MULTILINE)
FILE_END_RE = re.compile(r"^===endfile===\s*$", re.MULTILINE)


PROMPT_TEMPLATE = """\
You are authoring a per-scene visual mapping for scene `{scene_id}` in
a 2D side-scrolling game. The mapping is **MULTIPLE markdown files**:

1. `visual_mapping.md` — scene-wide manifest (frontmatter + prose).
   Lists the per-sub-layer mapping files in `mappings:`.
2. `mappings/<sub-layer>.md` — one file per sub-layer. Each declares
   in YAML frontmatter: the sub-layer id, the runtime parallax_layer
   target, the token `kind` (`terrain` or `dynamic`), and grid_size.

   - **Terrain sub-layers** (`kind: terrain`): contain a 12-row × 120-
     column ASCII grid in a ```map fenced block. Each token paints
     its `visual.symbol` across its full footprint (e.g. a 6×2 pond
     fills a 6×2 region of 'W').
   - **Dynamic sub-layers** (`kind: dynamic`): contain NO map grid.
     They list engine-driven props at point spawn coordinates in a
     `# props` YAML block. Pickups, spawn/exit markers, moving
     platforms, enemies — anything that animates or moves at runtime.

The compiler reads all the files and emits scene.assembly.json.

Your job:
  - Read the scene's gameplay description in scenes.json.
  - Pick tokens from the biome's tokens library using their declared symbols.
  - Author 5 mapping files for the play parallax + 3 backgrounds:
      * `bg-far.md`        (kind: terrain) — far mountains, tree bands
      * `bg-mid.md`        (kind: terrain) — mid-distance silhouettes
      * `play-terrain.md`  (kind: terrain) — ground / water / platforms /
                                              rocks / flowers / bushes /
                                              static hazards. ONE grid;
                                              decorations REPLACE ground
                                              at their cells (no stacking).
      * `play-dynamic.md`  (kind: dynamic) — spawn / exit / pickups /
                                              any engine-animated token.
                                              YAML-only, NO map block.
      * `fg.md`            (kind: terrain) — foreground frame elements.

Tokens with kind=dynamic in the tokens library go on `play-dynamic.md`.
Tokens with kind=terrain go on the appropriate terrain grid.

Read MODERN_SIDE_SCROLL_SPEC.md for the larger pipeline.
Read assets/tokens/TOKENS_SPEC.md for principles around token design.
Match the demo-grassland exemplars exactly in shape.

VISUAL REFERENCE: the first attached image is the biome's binding
landscape concept (`assets/concept/landscape-{biome}.png`). It locks
this biome's atmosphere, palette, and form vocabulary. When picking
which tokens to place and where, honor the painted landscape's silhouette
language — distant mountains where the concept shows distant mountains,
mid-distance trees where it shows them, ground line at the height the
concept paints it. The concept is the *what this biome looks like*; the
tokens are the *building blocks you compose to recreate that look*.

Scene to author:
  scene_id:    {scene_id}
  biome:       {biome}
  name:        {scene_name}
  description: {scene_description}
{retry_section}

Available tokens (from assets/tokens/{biome}/index.json — note the symbol):
{token_list}

Reference exemplar (each file shown with the file delimiter format
the compiler expects):

===file: visual_mapping.md ===
{demo_manifest}
===endfile===

===file: mappings/bg-far.md ===
{demo_bg_far}
===endfile===

===file: mappings/bg-mid.md ===
{demo_bg_mid}
===endfile===

===file: mappings/play-terrain.md ===
{demo_play_terrain}
===endfile===

===file: mappings/play-dynamic.md ===
{demo_play_dynamic}
===endfile===

===file: mappings/fg.md ===
{demo_fg}
===endfile===

Reference scene entry (assets/scenes.json):
```json
{scene_entry}
```

idea.md:
{idea}

OUTPUT FORMAT — multi-file. EACH file you produce must be wrapped in
the delimiter pair shown above. The first non-whitespace line of your
response MUST be `===file: visual_mapping.md ===`. After all files,
output nothing else (no preamble, no closing prose, no code fences
around the whole response).

Required files (in this order):
  1. ===file: visual_mapping.md === ... ===endfile===
  2. ===file: mappings/bg-far.md === ... ===endfile===
  3. ===file: mappings/bg-mid.md === ... ===endfile===
  4. ===file: mappings/play-terrain.md === ... ===endfile===
  5. ===file: mappings/play-dynamic.md === ... ===endfile===
  6. ===file: mappings/fg.md === ... ===endfile===

The play-dynamic.md file MUST NOT contain a ```map block. It contains
only YAML frontmatter (with `kind: dynamic`) and a `# props` YAML
block listing dynamic spawn points like
`{{ kind: spawn, token: spawn, at: [x, y] }}`.

CRITICAL CONSTRAINTS:
- visual_mapping.md frontmatter MUST list all 5 mapping files in the
  `mappings:` array.
- Each sub-layer file's frontmatter MUST declare `layer:` (matching
  the sub-layer id e.g. `play-collision`) and `parallax_layer:` (the
  runtime depth target — `bg-far`, `bg-mid`, `play`, or `fg`).
- ```map blocks MUST be exactly 12 rows × 120 columns. Each row is a
  string of 120 ASCII chars. Empty cells use `.`.
- Each token's footprint paints as a contiguous rectangle of its
  symbol (a 6×2 pond → 12 cells of 'W' in a 6×2 region).
- Same-symbol tokens CANNOT be adjacent on the grid (their regions
  would merge into one). Pick a token variant whose footprint matches
  the desired width, OR break adjacency with a different token.
- Every token's symbol MUST exist in the token list above for that
  parallax_layer's symbol space.
- The play parallax layer is split into TWO sub-layer files. Tokens
  with `passable: false` go on play-collision; passable tokens
  (decoration, passable hazards, markers) go on play-decor or in
  beats blocks.

Return ONLY the file blocks. No preamble, no explanation, no JSON.
"""


def load_tokens_index(project_root: Path, biome: str) -> dict[str, Any]:
    idx = project_root / "assets" / "tokens" / biome / "index.json"
    if not idx.exists():
        raise SystemExit(
            f"assets/tokens/{biome}/index.json not found — run 00-tokens first "
            f"(python scripts/author_tokens.py {biome})"
        )
    return json.loads(idx.read_text(encoding="utf-8"))


def render_token_list(index: dict[str, Any], project_root: Path) -> str:
    """One line per token: id, symbol, footprint, layers, category, fill, art-notes hint."""
    lines: list[str] = []
    for entry in index.get("tokens", []):
        bid = entry["id"]
        sym = entry.get("symbol", "?")
        fp = entry["footprint"]
        layers = entry.get("layers", [])
        cat = entry.get("category", "?")
        # `source` is a project-relative MD path; the per-token compiled
        # JSON sits next to it with .json suffix.
        src_rel = entry.get("source")
        notes = ""
        fill = ""
        if src_rel:
            json_path = (project_root / src_rel).with_suffix(".json")
            if json_path.exists():
                try:
                    data = json.loads(json_path.read_text())
                    visual = data.get("visual") or {}
                    fill = visual.get("fill", "")
                    an = visual.get("art_notes", "").strip().splitlines()
                    if an:
                        notes = an[0]
                except json.JSONDecodeError:
                    pass
        lines.append(
            f"  - {bid:<22} sym={sym!r:<5} fp={fp[0]}x{fp[1]:<2} layers={layers} cat={cat:<11} fill={fill}"
            + (f" — {notes}" if notes else "")
        )
    return "\n".join(lines)


def parse_multi_file_response(raw: str) -> dict[str, str]:
    """Parse the AI's multi-file response into {relpath: body}."""
    text = raw.strip()
    files: dict[str, str] = {}
    pos = 0
    while pos < len(text):
        m = FILE_BEGIN_RE.search(text, pos)
        if not m:
            break
        path = m.group("path").strip()
        end_m = FILE_END_RE.search(text, m.end())
        if not end_m:
            raise ValueError(f"unterminated file block for {path!r} (no ===endfile=== marker)")
        body = text[m.end():end_m.start()].lstrip("\n").rstrip()
        files[path] = body
        pos = end_m.end()
    if not files:
        raise ValueError("no ===file: ... === blocks found in response")
    return files


def write_files(scene_dir: Path, files: dict[str, str]) -> list[Path]:
    """Write each file under scene_dir. Creates subdirs as needed."""
    written: list[Path] = []
    for relpath, body in files.items():
        out = scene_dir / relpath
        out.parent.mkdir(parents=True, exist_ok=True)
        if not body.endswith("\n"):
            body += "\n"
        out.write_text(body, encoding="utf-8")
        written.append(out)
    return written


def validate_with_compiler(scene_id: str, project_root: Path) -> tuple[bool, str]:
    rc = subprocess.run(
        [sys.executable, "scripts/visual_mapping_compile.py", scene_id, "--check"],
        cwd=project_root,
        capture_output=True,
        text=True,
    )
    output = (rc.stdout or "") + (rc.stderr or "")
    return rc.returncode == 0, output


def author_scene(
    scene_id: str,
    project_root: Path,
    *,
    force: bool,
    dry_run: bool,
    max_retries: int = 1,
) -> bool:
    scene_dir = project_root / "assets" / "scenes" / scene_id
    out_path = scene_dir / "visual_mapping.md"
    if out_path.exists() and not force:
        print(f"  [{scene_id}] skip (visual_mapping.md exists, use --force to re-author)", file=sys.stderr)
        return True

    scenes_path = project_root / "assets" / "scenes.json"
    if not scenes_path.exists():
        raise SystemExit(f"assets/scenes.json not found at {scenes_path}")
    scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
    scene_entry = next((s for s in scenes if s.get("id") == scene_id), None)
    if not scene_entry:
        raise SystemExit(f"scene_id '{scene_id}' not found in assets/scenes.json")

    biome = scene_entry.get("biome", "grassland")
    index = load_tokens_index(project_root, biome)
    token_list = render_token_list(index, project_root)

    # Biome's landscape concept (from 01d-landscape-concept). Attached as
    # a vision input below so the AI sees the painted target, not just the
    # text style rules. Optional — fall through if not yet generated.
    landscape_concept = landscape_path(project_root, biome)

    idea = (project_root / "idea.md").read_text(encoding="utf-8").strip()
    demo_dir = project_root / "assets" / "scenes" / "demo-grassland"

    def read_or_placeholder(p: Path) -> str:
        return p.read_text(encoding="utf-8").rstrip() if p.exists() else "(no demo available)"

    demo_manifest        = read_or_placeholder(demo_dir / "visual_mapping.md")
    demo_bg_far          = read_or_placeholder(demo_dir / "mappings" / "bg-far.md")
    demo_bg_mid          = read_or_placeholder(demo_dir / "mappings" / "bg-mid.md")
    demo_play_terrain    = read_or_placeholder(demo_dir / "mappings" / "play-terrain.md")
    demo_play_dynamic    = read_or_placeholder(demo_dir / "mappings" / "play-dynamic.md")
    demo_fg              = read_or_placeholder(demo_dir / "mappings" / "fg.md")

    scene_dir.mkdir(parents=True, exist_ok=True)

    retry_section = ""

    for attempt in range(max_retries + 1):
        prompt = PROMPT_TEMPLATE.format(
            scene_id=scene_id,
            biome=biome,
            scene_name=scene_entry.get("name", scene_id),
            scene_description=scene_entry.get("description", ""),
            token_list=token_list,
            demo_manifest=demo_manifest,
            demo_bg_far=demo_bg_far,
            demo_bg_mid=demo_bg_mid,
            demo_play_terrain=demo_play_terrain,
            demo_play_dynamic=demo_play_dynamic,
            demo_fg=demo_fg,
            scene_entry=json.dumps(scene_entry, indent=2),
            idea=idea,
            retry_section=retry_section,
        )

        if dry_run:
            print(f"\n--- author_visual_mapping DRY-RUN for '{scene_id}' ({len(prompt)} chars) ---", file=sys.stderr)
            print(prompt[:2500] + ("\n...[truncated]" if len(prompt) > 2500 else ""), file=sys.stderr)
            return True

        backend = active_backend()
        cost = budget.cost_for_image(backend)
        attempt_label = f"attempt {attempt + 1}/{max_retries + 1}"
        print(f"  [{scene_id}] authoring via {backend} ({attempt_label}), cost={cost}¢", file=sys.stderr)

        image_paths = [landscape_concept] if landscape_concept.exists() else None
        if image_paths is None:
            print(
                f"  [{scene_id}] note: {landscape_concept.relative_to(project_root)} "
                f"not found — proceeding without landscape concept reference",
                file=sys.stderr,
            )

        with budget.charged(project_root, cost, f"text-{backend}", note=f"visual-mapping {scene_id} {attempt_label}"):
            raw = generate_text_from_image(prompt, image_paths=image_paths)

        try:
            files = parse_multi_file_response(raw)
        except ValueError as e:
            print(f"  [{scene_id}] parse failure: {e}", file=sys.stderr)
            (scene_dir / "_raw.txt").write_text(raw, encoding="utf-8")
            retry_section = (
                f"\nPREVIOUS ATTEMPT FAILED: could not parse multi-file response: {e}\n"
                f"Each file MUST be wrapped in `===file: <relpath> ===` ... `===endfile===`. "
                f"The response must consist ONLY of these blocks.\n"
            )
            continue

        write_files(scene_dir, files)
        print(f"  [{scene_id}] wrote {len(files)} file(s)", file=sys.stderr)

        ok, compiler_output = validate_with_compiler(scene_id, project_root)
        if ok:
            print(f"  [{scene_id}] ✓ validated by visual_mapping_compile.py", file=sys.stderr)
            return True

        print(f"  [{scene_id}] validation failed:\n{compiler_output}", file=sys.stderr)
        retry_section = (
            f"\nPREVIOUS ATTEMPT FAILED validation. The compiler said:\n"
            f"{compiler_output}\n\n"
            f"Fix the listed issues and re-emit ALL files.\n"
        )

    print(f"  [{scene_id}] FAILED after {max_retries + 1} attempt(s)", file=sys.stderr)
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id", nargs="?", help="scene id; omit to author every scene in scenes.json")
    ap.add_argument("--force", action="store_true", help="re-author even if visual_mapping.md exists")
    ap.add_argument("--dry-run", action="store_true", help="print the prompt, skip the AI call")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    if args.scene_id:
        targets = [args.scene_id]
    else:
        scenes_path = project_root / "assets" / "scenes.json"
        if not scenes_path.exists():
            raise SystemExit("assets/scenes.json not found")
        scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
        targets = [s["id"] for s in scenes]

    print(f"author_visual_mapping: {len(targets)} scene(s): {targets}", file=sys.stderr)

    ok = 0
    fail = 0
    for sid in targets:
        try:
            if author_scene(sid, project_root, force=args.force, dry_run=args.dry_run):
                ok += 1
            else:
                fail += 1
        except SystemExit:
            raise
        except Exception as e:
            print(f"  [{sid}] EXCEPTION: {e}", file=sys.stderr)
            fail += 1

    print(f"\nauthor_visual_mapping: {ok} ok, {fail} failed", file=sys.stderr)
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
