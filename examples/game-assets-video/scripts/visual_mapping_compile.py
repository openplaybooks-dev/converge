#!/usr/bin/env python3
"""visual_mapping_compile.py — manifest + per-layer grids → scene.assembly.json.

Pure deterministic compiler. Reads:
  - assets/scenes/{scene_id}/visual_mapping.md  (scene-wide manifest)
  - assets/scenes/{scene_id}/mappings/{layer}.md  (per-layer grid + beats)
  - assets/tokens/{biome}/index.json::by_layer  (symbol → token reverse index)

For each layer's ` ```map ` fenced block:
  - Flood-fill maximal contiguous regions of the same non-`.` symbol.
  - Compute each region's bounding box.
  - Verify the region is a perfect rectangle (all cells inside the
    bbox have the same symbol — no "holes").
  - Look up the token whose footprint matches the bbox AND whose
    symbol matches the region's symbol on this layer.
  - Emit `{token: <id>, at: [x_lo, y_lo], layer: <layer_id>}`.

For each layer's ` ```yaml ` block under `# beats`:
  - Parse as a YAML list of `{kind, token, at}` triples.
  - Add token instances to the assembly (markers don't appear on the
    grid; the beats block is where they live).

Errors are loud and specific:
  - "row 11 col 8: symbol 'g' is empty in this layer's by_layer index
    (no grassland token eligible for play has symbol 'g')"
  - "region of '#' at rows 11 cols 8-14 (7×1) doesn't match any token
    footprint. Available '#' tokens on play: ground (5×1). Either
    use a different token or add a 7×1 ground variant to the tokens library."

Usage:
  python scripts/visual_mapping_compile.py <scene_id>
  python scripts/visual_mapping_compile.py <scene_id> --check
  python scripts/visual_mapping_compile.py <scene_id> --force
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import yaml

from tokens_compile import find_project_root


FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
MAP_FENCE_RE = re.compile(r"```map\s*\n(.*?)\n```", re.DOTALL)
BEATS_FENCE_RE = re.compile(r"```yaml\s*\n(.*?)\n```", re.DOTALL)


class CompileError(Exception):
    pass


# ---------------------------------------------------------------------------
# Manifest parsing


def parse_manifest(text: str) -> dict[str, Any]:
    fm = FRONTMATTER_RE.match(text)
    if not fm:
        raise CompileError("visual_mapping.md missing frontmatter")
    try:
        data = yaml.safe_load(fm.group(1)) or {}
    except yaml.YAMLError as e:
        raise CompileError(f"visual_mapping.md frontmatter invalid YAML: {e}") from e

    for required in ("scene_id", "biome", "canvas", "layers"):
        if required not in data:
            raise CompileError(f"visual_mapping.md frontmatter missing '{required}'")

    canvas = data["canvas"]
    if not isinstance(canvas, dict):
        raise CompileError("canvas must be a mapping")
    for c in ("tile_size_px", "concept_tile_px", "grid_size"):
        if c not in canvas:
            raise CompileError(f"canvas missing '{c}'")

    layers = data["layers"]
    if not isinstance(layers, list) or not layers:
        raise CompileError("layers must be a non-empty list")
    for l in layers:
        if not isinstance(l, dict) or "id" not in l or "depth" not in l:
            raise CompileError(f"each layer must be {{id, depth}}, got {l!r}")

    return data


# ---------------------------------------------------------------------------
# Per-layer file parsing


def parse_layer_file(path: Path, grid_size: list[int]) -> tuple[str, str, str, list[str], list[dict[str, Any]]]:
    """Return (sub_layer_id, parallax_layer, kind, grid_rows, props).

    The sub-layer id is the file's own `layer:` field.
    The parallax_layer is the runtime depth target.
    `kind` is `terrain` (with a ```map grid) or `dynamic` (no grid;
        just a `# props` YAML list).
    grid_rows is empty when kind=dynamic.
    props is the list of {token, at, kind} entries from a `# props` or
        `# beats` YAML block (both accepted; `# props` is canonical for
        kind=dynamic, `# beats` is the legacy alias).
    """
    text = path.read_text(encoding="utf-8")

    fm = FRONTMATTER_RE.match(text)
    if not fm:
        raise CompileError(f"{path}: missing frontmatter")
    try:
        meta = yaml.safe_load(fm.group(1)) or {}
    except yaml.YAMLError as e:
        raise CompileError(f"{path}: invalid frontmatter YAML: {e}") from e

    sub_layer = str(meta.get("layer") or "")
    if not sub_layer:
        raise CompileError(f"{path}: frontmatter must declare 'layer' (sub-layer id)")
    parallax_layer = str(meta.get("parallax_layer") or sub_layer)
    kind = str(meta.get("kind", "terrain"))
    if kind not in ("terrain", "dynamic"):
        raise CompileError(f"{path}: kind must be 'terrain' or 'dynamic', got {kind!r}")

    body = text[fm.end():]

    rows: list[str] = []
    if kind == "terrain":
        map_match = MAP_FENCE_RE.search(body)
        if not map_match:
            raise CompileError(
                f"{path}: terrain sub-layer must have a ```map fenced block"
            )
        raw_grid = map_match.group(1)
        rows = raw_grid.split("\n")
        while rows and rows[-1] == "":
            rows.pop()

        expected_w, expected_h = grid_size
        if len(rows) != expected_h:
            raise CompileError(
                f"{path}: ```map has {len(rows)} rows, expected {expected_h}"
            )
        for i, row in enumerate(rows):
            if len(row) != expected_w:
                raise CompileError(
                    f"{path}: ```map row {i} has {len(row)} chars, expected {expected_w}"
                )
    else:
        # kind=dynamic: a ```map block is forbidden — dynamic tokens are point coords.
        if MAP_FENCE_RE.search(body):
            raise CompileError(
                f"{path}: dynamic sub-layer must NOT have a ```map block (dynamic tokens "
                f"are point coords; use a `# props` YAML block instead)"
            )

    # Props/beats: optional, but expected for dynamic.
    # Search for `# props` or `# beats` heading (props is canonical).
    props: list[dict[str, Any]] = []
    props_section = None
    for marker_re in (
        re.compile(r"(?m)^#+\s+props\s*$"),
        re.compile(r"(?m)^#+\s+beats\s*$"),
    ):
        m = marker_re.search(body)
        if m:
            props_section = body[m.end():]
            break

    if props_section is not None:
        yml = BEATS_FENCE_RE.search(props_section)
        if yml:
            try:
                parsed = yaml.safe_load(yml.group(1)) or []
            except yaml.YAMLError as e:
                raise CompileError(f"{path}: props YAML invalid: {e}") from e
            if not isinstance(parsed, list):
                raise CompileError(f"{path}: props block must be a list, got {type(parsed).__name__}")
            for entry in parsed:
                if not isinstance(entry, dict):
                    raise CompileError(f"{path}: props entry must be a mapping, got {entry!r}")
                # Accept either `token:` (canonical) or legacy `brick:` for
                # backward compatibility while authoring catches up.
                tok_key = "token" if "token" in entry else ("brick" if "brick" in entry else None)
                if tok_key is None or "at" not in entry:
                    raise CompileError(
                        f"{path}: props entry missing 'token' (or 'at'): {entry!r}"
                    )
                props.append({
                    "token": str(entry[tok_key]),
                    "at": [int(entry["at"][0]), int(entry["at"][1])],
                    "kind": entry.get("kind"),
                })

    return sub_layer, parallax_layer, kind, rows, props


# ---------------------------------------------------------------------------
# Region detection


def find_regions(rows: list[str]) -> list[dict[str, Any]]:
    """Flood-fill maximal contiguous same-symbol regions (4-connected,
    skipping `.` cells). Each region has its bbox + the cells it covers.
    Returns a list of {symbol, x_lo, y_lo, x_hi, y_hi, cells}."""
    h = len(rows)
    if h == 0:
        return []
    w = len(rows[0])
    seen = [[False] * w for _ in range(h)]
    regions: list[dict[str, Any]] = []

    for y in range(h):
        for x in range(w):
            if seen[y][x]:
                continue
            sym = rows[y][x]
            if sym == ".":
                seen[y][x] = True
                continue
            # BFS over same-symbol 4-connected cells
            stack = [(x, y)]
            cells: list[tuple[int, int]] = []
            x_lo = x_hi = x
            y_lo = y_hi = y
            while stack:
                cx, cy = stack.pop()
                if cx < 0 or cy < 0 or cx >= w or cy >= h:
                    continue
                if seen[cy][cx]:
                    continue
                if rows[cy][cx] != sym:
                    continue
                seen[cy][cx] = True
                cells.append((cx, cy))
                if cx < x_lo: x_lo = cx
                if cx > x_hi: x_hi = cx
                if cy < y_lo: y_lo = cy
                if cy > y_hi: y_hi = cy
                stack += [(cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)]
            regions.append({
                "symbol": sym,
                "x_lo": x_lo, "y_lo": y_lo,
                "x_hi": x_hi, "y_hi": y_hi,
                "cells": cells,
            })
    return regions


def is_rectangular(region: dict[str, Any]) -> bool:
    """Return True if every cell in the bbox is part of the region."""
    bbox_w = region["x_hi"] - region["x_lo"] + 1
    bbox_h = region["y_hi"] - region["y_lo"] + 1
    return len(region["cells"]) == bbox_w * bbox_h


# ---------------------------------------------------------------------------
# Compile a single layer


def compile_layer(
    layer_id: str,
    rows: list[str],
    by_layer_kind: dict[str, dict[str, dict[str, str]]],
    tokens_index: dict[str, Any],
) -> list[dict[str, Any]]:
    """Project the grid into token instances for this layer (terrain only)."""
    layer_symbols = (by_layer_kind.get(layer_id) or {}).get("terrain") or {}
    tokens_by_id = {t["id"]: t for t in tokens_index.get("tokens", [])}

    instances: list[dict[str, Any]] = []
    for region in find_regions(rows):
        sym = region["symbol"]
        bbox_w = region["x_hi"] - region["x_lo"] + 1
        bbox_h = region["y_hi"] - region["y_lo"] + 1

        if sym not in layer_symbols:
            avail = ", ".join(f"{k!r}={v}" for k, v in sorted(layer_symbols.items()))
            raise CompileError(
                f"layer '{layer_id}': region of {sym!r} at rows {region['y_lo']}-{region['y_hi']} "
                f"cols {region['x_lo']}-{region['x_hi']}: symbol not registered for terrain on this layer. "
                f"Available terrain symbols on '{layer_id}': {avail or '(none)'}"
            )

        token_id = layer_symbols[sym]
        token = tokens_by_id.get(token_id)
        if not token:
            raise CompileError(
                f"layer '{layer_id}': symbol {sym!r} maps to token '{token_id}' "
                f"but tokens index has no entry for it (corrupt index?)"
            )
        bw, bh = token["footprint"]

        if not is_rectangular(region):
            raise CompileError(
                f"layer '{layer_id}': region of {sym!r} at rows {region['y_lo']}-{region['y_hi']} "
                f"cols {region['x_lo']}-{region['x_hi']} is non-rectangular "
                f"({len(region['cells'])} cells in a {bbox_w}×{bbox_h} bbox). "
                f"Tokens paint as rectangular footprints; fill the bbox completely or split into separate regions."
            )

        if (bw, bh) != (bbox_w, bbox_h):
            similar = [
                f"{t['id']} ({t['footprint'][0]}×{t['footprint'][1]})"
                for t in tokens_index.get("tokens", [])
                if t.get("symbol") == sym and layer_id in t.get("layers", [])
                   and t.get("kind", "terrain") == "terrain"
            ]
            raise CompileError(
                f"layer '{layer_id}': region of {sym!r} at rows {region['y_lo']}-{region['y_hi']} "
                f"cols {region['x_lo']}-{region['x_hi']} is {bbox_w}×{bbox_h}, "
                f"but token '{token_id}' has footprint {bw}×{bh}. "
                f"Available {sym!r} terrain tokens on '{layer_id}': {', '.join(similar)}. "
                f"Use a token whose footprint matches, or split the region using a different token."
            )

        # Anchor: the assembly's `at` field is the token's bottom-left or top-left
        # depending on token.anchor. Match scene_stamp.py's interpretation.
        anchor = token.get("anchor", "bottom-left")
        if anchor == "bottom-left":
            at = [region["x_lo"], region["y_hi"]]
        elif anchor == "top-left":
            at = [region["x_lo"], region["y_lo"]]
        elif anchor == "center":
            at = [region["x_lo"] + bbox_w // 2, region["y_lo"] + bbox_h // 2]
        else:
            at = [region["x_lo"], region["y_hi"]]

        instances.append({
            "token": token_id,
            "at": at,
            "layer": layer_id,
        })

    return instances


# ---------------------------------------------------------------------------
# Tokens index loading


def load_tokens_index(project_root: Path, biome: str) -> dict[str, Any]:
    idx_path = project_root / "assets" / "tokens" / biome / "index.json"
    if not idx_path.exists():
        raise CompileError(
            f"assets/tokens/{biome}/index.json not found — run scripts/tokens_compile.py {biome}"
        )
    return json.loads(idx_path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Main compile


def compile_scene(scene_dir: Path, project_root: Path) -> dict[str, Any]:
    manifest_path = scene_dir / "visual_mapping.md"
    if not manifest_path.exists():
        raise CompileError(f"{manifest_path} not found")
    manifest = parse_manifest(manifest_path.read_text(encoding="utf-8"))

    biome = str(manifest["biome"])
    tokens_index = load_tokens_index(project_root, biome)
    by_layer_kind = tokens_index.get("by_layer_kind") or {}
    if not by_layer_kind:
        raise CompileError(
            f"assets/tokens/{biome}/index.json missing by_layer_kind index — re-run scripts/tokens_compile.py {biome}"
        )
    tokens_by_id = {t["id"]: t for t in tokens_index.get("tokens", [])}

    grid_size = list(manifest["canvas"]["grid_size"])
    valid_parallax = {str(l["id"]) for l in manifest["layers"]}

    mappings_paths = manifest.get("mappings")
    if not mappings_paths:
        raise CompileError("visual_mapping.md frontmatter missing 'mappings' (list of sub-layer file paths)")
    if not isinstance(mappings_paths, list):
        raise CompileError("'mappings' must be a list of file paths relative to the scene directory")

    all_tokens: list[dict[str, Any]] = []
    for rel in mappings_paths:
        layer_path = scene_dir / str(rel)
        if not layer_path.exists():
            raise CompileError(f"sub-layer file {layer_path} not found (referenced from manifest)")
        sub_layer, parallax_layer, file_kind, rows, props = parse_layer_file(layer_path, grid_size)
        if parallax_layer not in valid_parallax:
            raise CompileError(
                f"{layer_path}: parallax_layer={parallax_layer!r} not in manifest layers {sorted(valid_parallax)}"
            )

        if file_kind == "terrain":
            for inst in compile_layer(parallax_layer, rows, by_layer_kind, tokens_index):
                inst["layer"] = parallax_layer
                all_tokens.append(inst)
            # A terrain file's `# props` block is unusual but allowed —
            # it's a way to attach point-coord markers to a terrain
            # layer (legacy beats). Validate each prop's token kind.
            for p in props:
                pt = tokens_by_id.get(p["token"])
                if pt and pt.get("kind") == "terrain":
                    raise CompileError(
                        f"{layer_path}: terrain token '{p['token']}' appears in a # props block. "
                        f"Terrain tokens belong on the ```map grid; only dynamic tokens belong in props."
                    )
                all_tokens.append({"token": p["token"], "at": list(p["at"]), "layer": parallax_layer})
        else:
            # Dynamic file: validate every prop is a dynamic token.
            for p in props:
                pt = tokens_by_id.get(p["token"])
                if not pt:
                    raise CompileError(
                        f"{layer_path}: prop references unknown token '{p['token']}'"
                    )
                if pt.get("kind") != "dynamic":
                    raise CompileError(
                        f"{layer_path}: token '{p['token']}' has kind={pt.get('kind')!r} "
                        f"but appears in a dynamic sub-layer. Dynamic sub-layers only accept "
                        f"tokens with kind=dynamic."
                    )
                if parallax_layer not in pt.get("layers", []):
                    raise CompileError(
                        f"{layer_path}: token '{p['token']}' not eligible for parallax_layer "
                        f"{parallax_layer!r} (eligible: {pt.get('layers')})"
                    )
                all_tokens.append({"token": p["token"], "at": list(p["at"]), "layer": parallax_layer})

    return {
        "scene_id": str(manifest["scene_id"]),
        "biome": biome,
        "canvas": {
            "tile_size_px": int(manifest["canvas"]["tile_size_px"]),
            "concept_tile_px": int(manifest["canvas"]["concept_tile_px"]),
            "grid_size": grid_size,
        },
        "layers": [{"id": str(l["id"]), "depth": float(l["depth"])} for l in manifest["layers"]],
        "tokens": all_tokens,
    }


# ---------------------------------------------------------------------------
# CLI


def main() -> int:
    ap = argparse.ArgumentParser(description="Compile visual_mapping.md + mappings/*.md → scene.assembly.json")
    ap.add_argument("scene_id")
    ap.add_argument("--check", action="store_true", help="parse + validate, do not write JSON")
    ap.add_argument("--force", action="store_true", help="overwrite existing scene.assembly.json")
    args = ap.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id

    try:
        assembly = compile_scene(scene_dir, project_root)
    except CompileError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2

    n = len(assembly["tokens"])
    by_layer_count: dict[str, int] = {}
    for inst in assembly["tokens"]:
        by_layer_count[inst["layer"]] = by_layer_count.get(inst["layer"], 0) + 1
    print(f"  parsed {n} token instances across {len(by_layer_count)} layer(s):")
    for layer in assembly["layers"]:
        print(f"    {layer['id']} (depth={layer['depth']}): {by_layer_count.get(layer['id'], 0)}")

    if args.check:
        print("OK (check only — no write)")
        return 0

    out = scene_dir / "scene.assembly.json"
    if out.exists() and not args.force:
        print(f"error: {out} already exists. Pass --force to overwrite.", file=sys.stderr)
        return 3
    out.write_text(json.dumps(assembly, indent=2) + "\n", encoding="utf-8")
    print(f"  wrote {out.relative_to(project_root)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
