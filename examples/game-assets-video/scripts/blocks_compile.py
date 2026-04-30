#!/usr/bin/env python3
"""blocks_compile.py — compile block library MD files to JSON.

Walks `blocks/{biome}/*.md`, parses each block (frontmatter + tile-map
fenced block + skeleton-kinds fenced block + connection-rules), validates
against the schema, emits `{id}.json` next to the source `.md`, and
writes a per-biome `index.json` listing every compiled block.

Schema reference: `blocks/SCHEMA.md`. Tile vocabulary: `blocks/TILE_VOCAB.md`.

Usage:
  python scripts/blocks_compile.py                # compile every biome
  python scripts/blocks_compile.py grassland      # compile one biome
  python scripts/blocks_compile.py --check        # validate without writing
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

import yaml


# ---------------------------------------------------------------------------
# Schema constants

VALID_CATEGORIES = {"ground", "hazard", "platform", "decoration", "background", "marker"}

# Skeleton kinds defined globally. Block authors may add biome-specific
# kinds, but the core set is fixed and matches existing terrain.json::legend.
DEFAULT_LEGEND: dict[str, dict[str, Any]] = {
    ".": {"kind": "vast",     "color": None,        "concept_hint": "sky / atmosphere / mid-distance scenery"},
    "#": {"kind": "land",     "color": "#5B3B1C",   "concept_hint": "solid foreground earth — grass on top, dirt body"},
    "~": {"kind": "water",    "color": "#3A6FAA",   "concept_hint": "wetland / pond edge — reeds, lily pads"},
    "=": {"kind": "platform", "color": "#7A6F5A",   "concept_hint": "raised wood/grass-topped lip with clean top edge"},
    "^": {"kind": "hazard",   "color": "#A03A3A",   "concept_hint": "thorny growth or jagged rock"},
    "&": {"kind": "decor",    "color": "#3F7A4A",   "concept_hint": "painted background decoration (trees, mountains)"},
}

# Tile-map vocabulary. Source: blocks/TILE_VOCAB.md. Hardcoded here so the
# compiler stays self-contained.
TILE_VOCAB: dict[str, str | None] = {
    ".": None,                  # sky-passthrough; no tilemap blit
    "G": "grass",
    "F": "grass-flowers",
    "D": "dirt",
    "1": "path-corner-NE",
    "2": "path-corner-NW",
    "3": "path-corner-SE",
    "4": "path-corner-SW",
    "W": "water",
    "S": "water-edge-grass",
    "T": "tree-stump",
    "R": "rock-small",
}

VALID_CONNECTION_SIDES = {"left", "right", "top", "bottom"}
WORLD_FLOOR_SENTINEL = "world-floor"


# ---------------------------------------------------------------------------
# Errors

class BlockCompileError(Exception):
    """One failed block. Caller decides whether to halt or accumulate."""

    def __init__(self, source: Path, message: str) -> None:
        super().__init__(f"{source}: {message}")
        self.source = source
        self.message = message


# ---------------------------------------------------------------------------
# Parsing

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
SECTION_RE = re.compile(r"(?m)^#\s+([a-z0-9-]+)\s*$")
FENCED_RE = re.compile(r"```[a-zA-Z0-9]*\n(.*?)\n```", re.DOTALL)


def parse_block(source: Path) -> dict[str, Any]:
    """Parse one MD file into a raw dict (not yet validated)."""
    text = source.read_text(encoding="utf-8")

    fm_match = FRONTMATTER_RE.match(text)
    if not fm_match:
        raise BlockCompileError(source, "missing frontmatter (--- ... ---)")
    try:
        frontmatter = yaml.safe_load(fm_match.group(1)) or {}
    except yaml.YAMLError as e:
        raise BlockCompileError(source, f"invalid YAML frontmatter: {e}") from e
    body = text[fm_match.end():]

    sections = _split_sections(body)
    for required in ("tile-map", "skeleton-kinds", "connection-rules"):
        if required not in sections:
            raise BlockCompileError(source, f"missing section '# {required}'")

    tile_map_grid = _parse_fenced_grid(source, "tile-map", sections["tile-map"])
    skeleton_grid = _parse_fenced_grid(source, "skeleton-kinds", sections["skeleton-kinds"])
    connection_rules = _parse_connection_rules(source, sections["connection-rules"])

    return {
        "frontmatter": frontmatter,
        "tile_map": tile_map_grid,
        "skeleton_kinds": skeleton_grid,
        "connection_rules": connection_rules,
    }


def _split_sections(body: str) -> dict[str, str]:
    """Split markdown body into {section_name: section_body} by H1 headers."""
    matches = list(SECTION_RE.finditer(body))
    out: dict[str, str] = {}
    for i, m in enumerate(matches):
        name = m.group(1).strip().lower()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        out[name] = body[start:end]
    return out


def _parse_fenced_grid(source: Path, name: str, section: str) -> list[str]:
    """Extract the first fenced code block from a section as a list of rows."""
    fenced = FENCED_RE.search(section)
    if not fenced:
        raise BlockCompileError(source, f"section '{name}' has no fenced code block")
    rows = [line for line in fenced.group(1).split("\n") if line]
    if not rows:
        raise BlockCompileError(source, f"section '{name}' fenced block is empty")
    width = len(rows[0])
    for i, row in enumerate(rows):
        if len(row) != width:
            raise BlockCompileError(
                source,
                f"section '{name}' row {i} has width {len(row)}, expected {width}",
            )
    return rows


def _parse_connection_rules(source: Path, section: str) -> dict[str, Any]:
    """Parse a bullet list of `side: [kind, ...]` or `side: world-floor`."""
    rules: dict[str, Any] = {}
    for line in section.splitlines():
        s = line.strip()
        if not s or not s.startswith("-"):
            continue
        s = s.lstrip("-").strip()
        if ":" not in s:
            raise BlockCompileError(source, f"connection rule missing ':' — '{line}'")
        side, value = s.split(":", 1)
        side = side.strip().lower()
        value = value.strip()
        if side not in VALID_CONNECTION_SIDES:
            raise BlockCompileError(
                source,
                f"connection rule side '{side}' not in {sorted(VALID_CONNECTION_SIDES)}",
            )
        if value == WORLD_FLOOR_SENTINEL:
            rules[side] = WORLD_FLOOR_SENTINEL
        elif value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            if not inner:
                rules[side] = []
            else:
                rules[side] = [x.strip() for x in inner.split(",") if x.strip()]
        else:
            raise BlockCompileError(
                source,
                f"connection rule value '{value}' must be `[kind, ...]` or `world-floor`",
            )
    return rules


# ---------------------------------------------------------------------------
# Validation + transformation

@dataclass
class CompiledBlock:
    id: str
    biome: str
    category: str
    footprint: tuple[int, int]              # (width, height)
    tile_map: list[list[str | None]]        # tile-id per cell, None = sky-passthrough
    skeleton_kinds: list[list[str]]         # kind name per cell
    gameplay: dict[str, Any]
    connection_rules: dict[str, Any]
    art_notes: str
    source: str                             # relative path for traceability

    def to_json(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "biome": self.biome,
            "category": self.category,
            "footprint": list(self.footprint),
            "tile_map": self.tile_map,
            "skeleton_kinds": self.skeleton_kinds,
            "gameplay": self.gameplay,
            "connection_rules": self.connection_rules,
            "art_notes": self.art_notes,
            "source": self.source,
        }


def compile_block(source: Path, project_root: Path) -> CompiledBlock:
    raw = parse_block(source)
    fm = raw["frontmatter"]

    for required in ("id", "biome", "category", "footprint"):
        if required not in fm:
            raise BlockCompileError(source, f"frontmatter missing required key '{required}'")

    block_id = str(fm["id"]).strip()
    biome = str(fm["biome"]).strip()
    category = str(fm["category"]).strip()
    if category not in VALID_CATEGORIES:
        raise BlockCompileError(
            source, f"category '{category}' not in {sorted(VALID_CATEGORIES)}"
        )

    fp = fm["footprint"]
    if not isinstance(fp, dict) or "width" not in fp or "height" not in fp:
        raise BlockCompileError(source, "footprint must be {width, height}")
    fw, fh = int(fp["width"]), int(fp["height"])
    if fw <= 0 or fh <= 0:
        raise BlockCompileError(source, f"footprint must be positive, got {fw}x{fh}")

    tile_grid = raw["tile_map"]
    skel_grid = raw["skeleton_kinds"]
    if len(tile_grid) != fh or any(len(r) != fw for r in tile_grid):
        raise BlockCompileError(
            source,
            f"tile-map dimensions {len(tile_grid[0]) if tile_grid else 0}x{len(tile_grid)} "
            f"don't match footprint {fw}x{fh}",
        )
    if len(skel_grid) != fh or any(len(r) != fw for r in skel_grid):
        raise BlockCompileError(
            source,
            f"skeleton-kinds dimensions don't match footprint {fw}x{fh}",
        )

    tile_resolved: list[list[str | None]] = []
    for y, row in enumerate(tile_grid):
        out_row: list[str | None] = []
        for x, ch in enumerate(row):
            if ch not in TILE_VOCAB:
                raise BlockCompileError(
                    source,
                    f"tile-map char '{ch}' at ({x},{y}) not in TILE_VOCAB "
                    f"({sorted(TILE_VOCAB.keys())})",
                )
            out_row.append(TILE_VOCAB[ch])
        tile_resolved.append(out_row)

    skel_resolved: list[list[str]] = []
    for y, row in enumerate(skel_grid):
        out_row: list[str] = []
        for x, ch in enumerate(row):
            if ch not in DEFAULT_LEGEND:
                raise BlockCompileError(
                    source,
                    f"skeleton-kinds char '{ch}' at ({x},{y}) not in legend "
                    f"({sorted(DEFAULT_LEGEND.keys())})",
                )
            out_row.append(DEFAULT_LEGEND[ch]["kind"])
        skel_resolved.append(out_row)

    rules = raw["connection_rules"]
    valid_kinds = {entry["kind"] for entry in DEFAULT_LEGEND.values()}
    for side, value in rules.items():
        if value == WORLD_FLOOR_SENTINEL:
            continue
        for kind in value:
            if kind not in valid_kinds:
                raise BlockCompileError(
                    source,
                    f"connection rule '{side}: [{kind}, ...]' references unknown kind '{kind}' "
                    f"(known: {sorted(valid_kinds)})",
                )

    gameplay_default = {"passable": False, "damage": 0, "beats": []}
    gameplay = {**gameplay_default, **(fm.get("gameplay") or {})}

    art_notes = (fm.get("art_notes") or "").strip()
    rel = source.relative_to(project_root).as_posix()

    return CompiledBlock(
        id=block_id,
        biome=biome,
        category=category,
        footprint=(fw, fh),
        tile_map=tile_resolved,
        skeleton_kinds=skel_resolved,
        gameplay=gameplay,
        connection_rules=rules,
        art_notes=art_notes,
        source=rel,
    )


# ---------------------------------------------------------------------------
# CLI

def find_project_root(start: Path | None = None) -> Path:
    """Walk up from start (default: this file) until we find a directory
    containing a `blocks/` folder. The example project root."""
    cur = (start or Path(__file__)).resolve()
    while True:
        if (cur / "blocks").is_dir():
            return cur
        if cur.parent == cur:
            raise FileNotFoundError("could not locate project root (no blocks/ found)")
        cur = cur.parent


def compile_biome(biome_dir: Path, project_root: Path, *, write: bool) -> tuple[list[CompiledBlock], list[BlockCompileError]]:
    blocks: list[CompiledBlock] = []
    errors: list[BlockCompileError] = []
    for md in sorted(biome_dir.glob("*.md")):
        try:
            block = compile_block(md, project_root)
        except BlockCompileError as e:
            errors.append(e)
            continue
        blocks.append(block)
        if write:
            out = md.with_suffix(".json")
            out.write_text(json.dumps(block.to_json(), indent=2) + "\n", encoding="utf-8")

    if write and not errors:
        index = {
            "biome": biome_dir.name,
            "blocks": [
                {
                    "id": b.id,
                    "category": b.category,
                    "footprint": list(b.footprint),
                    "source": b.source,
                }
                for b in sorted(blocks, key=lambda b: b.id)
            ],
        }
        (biome_dir / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")

    return blocks, errors


def main() -> int:
    p = argparse.ArgumentParser(description="Compile block library MD → JSON")
    p.add_argument("biome", nargs="?", help="biome name (folder under blocks/); omit for all")
    p.add_argument("--check", action="store_true", help="validate only, do not write JSON")
    args = p.parse_args()

    project_root = find_project_root()
    blocks_dir = project_root / "blocks"
    if not blocks_dir.is_dir():
        print(f"error: {blocks_dir} not found", file=sys.stderr)
        return 1

    if args.biome:
        targets = [blocks_dir / args.biome]
    else:
        targets = [d for d in sorted(blocks_dir.iterdir()) if d.is_dir()]

    total_ok = 0
    total_err = 0
    for biome_dir in targets:
        if not biome_dir.is_dir():
            print(f"error: {biome_dir} not a directory", file=sys.stderr)
            total_err += 1
            continue
        blocks, errors = compile_biome(biome_dir, project_root, write=not args.check)
        for e in errors:
            print(f"FAIL {e}", file=sys.stderr)
        if blocks:
            verb = "validated" if args.check else "compiled"
            print(f"{biome_dir.name}: {verb} {len(blocks)} blocks")
        total_ok += len(blocks)
        total_err += len(errors)

    print(f"\nTotal: {total_ok} ok, {total_err} failed")
    return 0 if total_err == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
