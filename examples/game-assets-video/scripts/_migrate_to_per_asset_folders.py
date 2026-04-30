#!/usr/bin/env python3
"""_migrate_to_per_asset_folders.py — one-shot migration to per-asset folders.

The flat layout (each asset is `{id}.png` + `{id}.prompt.txt` + `{id}.seed.txt`
sitting in a shared parent directory) is being replaced with a per-asset
folder layout: each asset gets its own `{id}/` containing `image.png`
or `concept.png`, `prompt.txt`, `seed.txt`.

This script:
  1. Walks every token MD under `assets/tokens/{biome}/{cat}/{id}.md` and
     migrates `{id}.concept.{png,prompt.txt,seed.txt}` into `{id}/`.
     Inside the folder the PNG is renamed to `concept.png` (the value
     `sketch.file:` in the MD points at it). The MD's `sketch.file:`
     line is regex-rewritten in place from `{id}.concept.png` →
     `{id}/concept.png`.
  2. Migrates each `assets/concept/landscape-{biome}.png` triple into
     `assets/concept/landscape-{biome}/{image.png,prompt.txt,seed.txt}`.
  3. Migrates `assets/concept/style-sheet.png` triple into
     `assets/concept/style-sheet/`.
  4. Migrates `assets/concept/hero-shot.png` triple into
     `assets/concept/hero-shot/`.

Idempotent: if the destination folder already exists, the asset is
considered migrated and skipped.

Run once, then delete the script. No paid AI calls.

Usage:
  python scripts/_migrate_to_per_asset_folders.py
  python scripts/_migrate_to_per_asset_folders.py --dry-run
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

from lib.sprite import find_project_root


FRONTMATTER_RE = re.compile(r"^(---\s*\n)(.*?)(\n---\s*\n)", re.DOTALL)


def move_or_skip(src: Path, dst: Path, dry_run: bool) -> str:
    """Move a single file. Return one of 'moved', 'skipped-missing', 'skipped-exists'."""
    if not src.exists():
        return "skipped-missing"
    if dst.exists():
        return "skipped-exists"
    if dry_run:
        print(f"    [dry] mv {src.relative_to(src.parents[2])} → {dst.relative_to(dst.parents[2])}")
        return "moved"
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return "moved"


def rewrite_token_md_sketch_file(md_path: Path, old_filename: str, new_filename: str, dry_run: bool) -> bool:
    """Rewrite `sketch.file:` in a token MD's frontmatter from old to new.
    Returns True if the line was found+changed."""
    text = md_path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        return False
    head, yaml_text, tail = m.group(1), m.group(2), m.group(3)
    rest = text[m.end():]

    # Match `  file: <something>` line, replace its value if it matches old_filename.
    pat = re.compile(r"(?m)^(\s*file:\s*)" + re.escape(old_filename) + r"\s*$")
    if not pat.search(yaml_text):
        return False
    new_yaml = pat.sub(rf"\g<1>{new_filename}", yaml_text, count=1)
    if new_yaml == yaml_text:
        return False
    if dry_run:
        print(f"    [dry] rewrite sketch.file in {md_path.name}: {old_filename} → {new_filename}")
        return True
    md_path.write_text(head + new_yaml + tail + rest, encoding="utf-8")
    return True


def migrate_tokens(project_root: Path, dry_run: bool) -> dict[str, int]:
    """For each token MD, move {id}.concept.* → {id}/{concept.png, prompt.txt, seed.txt}
    and rewrite the MD's sketch.file value."""
    counts = {"migrated": 0, "skipped": 0}
    tokens_root = project_root / "assets" / "tokens"
    if not tokens_root.is_dir():
        return counts

    for biome_dir in sorted(p for p in tokens_root.iterdir() if p.is_dir()):
        for md in sorted(biome_dir.rglob("*.md")):
            if md.parent == biome_dir:
                continue  # skip top-level docs (PREVIEW.md)
            if md.name in {"SCHEMA.md", "TOKENS_SPEC.md", "ASSEMBLY.md"}:
                continue
            tid = md.stem
            asset_dir = md.parent / tid

            old_png = md.parent / f"{tid}.concept.png"
            old_prompt = md.parent / f"{tid}.concept.prompt.txt"
            old_seed = md.parent / f"{tid}.concept.seed.txt"

            if asset_dir.exists() and (asset_dir / "concept.png").exists():
                counts["skipped"] += 1
                continue

            if not old_png.exists():
                # Nothing to migrate for this token (either never generated
                # or already migrated by hand).
                counts["skipped"] += 1
                continue

            print(f"  [{biome_dir.name}/{tid}] migrating → {asset_dir.relative_to(project_root)}/")
            move_or_skip(old_png, asset_dir / "concept.png", dry_run)
            move_or_skip(old_prompt, asset_dir / "prompt.txt", dry_run)
            move_or_skip(old_seed, asset_dir / "seed.txt", dry_run)
            rewrite_token_md_sketch_file(md, f"{tid}.concept.png", f"{tid}/concept.png", dry_run)
            counts["migrated"] += 1

    return counts


def migrate_simple_triple(
    project_root: Path,
    asset_name: str,  # e.g. "style-sheet" or "landscape-grassland"
    *,
    parent_dir: Path,
    dst_image_name: str = "image.png",
    dry_run: bool,
) -> str:
    """Move {parent_dir}/{asset_name}.{png,prompt.txt,seed.txt} into
    {parent_dir}/{asset_name}/{dst_image_name, prompt.txt, seed.txt}.
    Returns 'migrated', 'skipped-already', or 'skipped-missing'."""
    old_png = parent_dir / f"{asset_name}.png"
    old_prompt = parent_dir / f"{asset_name}.prompt.txt"
    old_seed = parent_dir / f"{asset_name}.seed.txt"
    asset_dir = parent_dir / asset_name

    if asset_dir.exists() and (asset_dir / dst_image_name).exists():
        return "skipped-already"
    if not old_png.exists():
        return "skipped-missing"

    print(f"  [{asset_name}] migrating → {asset_dir.relative_to(project_root)}/")
    move_or_skip(old_png, asset_dir / dst_image_name, dry_run)
    move_or_skip(old_prompt, asset_dir / "prompt.txt", dry_run)
    move_or_skip(old_seed, asset_dir / "seed.txt", dry_run)
    return "migrated"


def migrate_concept_anchors(project_root: Path, dry_run: bool) -> dict[str, int]:
    counts = {"migrated": 0, "skipped": 0}
    concept_dir = project_root / "assets" / "concept"
    if not concept_dir.is_dir():
        return counts

    # Project-wide anchors: style-sheet, hero-shot.
    for name in ("style-sheet", "hero-shot"):
        result = migrate_simple_triple(
            project_root, name, parent_dir=concept_dir, dry_run=dry_run
        )
        counts["migrated" if result == "migrated" else "skipped"] += 1

    # Per-biome landscape concepts: any landscape-{biome}.png file.
    # Use a glob to find them, but exclude ones whose folder already exists.
    for png in sorted(concept_dir.glob("landscape-*.png")):
        if png.parent == concept_dir and png.is_file():
            asset_name = png.stem  # "landscape-grassland"
            result = migrate_simple_triple(
                project_root, asset_name, parent_dir=concept_dir, dry_run=dry_run
            )
            counts["migrated" if result == "migrated" else "skipped"] += 1

    return counts


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="print actions, don't move files")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    print(f"migrating to per-asset folders under {project_root}", file=sys.stderr)
    if args.dry_run:
        print("(dry-run mode — no files moved)", file=sys.stderr)

    print("\n=== concept anchors ===")
    anchor_counts = migrate_concept_anchors(project_root, args.dry_run)
    print(
        f"  anchors: migrated={anchor_counts['migrated']} skipped={anchor_counts['skipped']}",
        file=sys.stderr,
    )

    print("\n=== tokens ===")
    token_counts = migrate_tokens(project_root, args.dry_run)
    print(
        f"  tokens: migrated={token_counts['migrated']} skipped={token_counts['skipped']}",
        file=sys.stderr,
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())
