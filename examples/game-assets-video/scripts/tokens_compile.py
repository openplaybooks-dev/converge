#!/usr/bin/env python3
"""tokens_compile.py — load and validate a biome's tokens library.

Walks `assets/tokens/{biome}/**/*.md` recursively, parses each token (frontmatter
only — the body is the sketch SVG, not embedded fenced grids), validates
including the category-folder invariant, and emits
`assets/tokens/{biome}/index.json`.

Usage:
  python scripts/tokens_compile.py                # compile every biome
  python scripts/tokens_compile.py grassland      # compile one biome
  python scripts/tokens_compile.py --check        # validate without writing
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


# Concept-image long side (must match generate_token_concepts.LONG_SIDE_PX).
# A token's PNG concept has long side = 1024 px and short side scaled by
# footprint aspect ratio. Used as the default for sketch.size_px when the
# field is omitted.
LONG_SIDE_PX = 1024

VALID_CATEGORIES = {"ground", "hazard", "platform", "decoration", "background", "marker"}
VALID_LAYERS = {"bg-far", "bg-mid", "play", "fg"}
VALID_ANCHORS = {"bottom-left", "top-left", "center"}
VALID_DETAIL_DENSITIES = {"low", "medium", "high"}
VALID_KINDS = {"terrain", "dynamic"}
RESERVED_SYMBOLS = {".", " ", "\t", "`"}

# category enum value -> on-disk subfolder name (pluralised for readability)
CATEGORY_TO_FOLDER = {
    "ground": "ground",
    "platform": "platforms",
    "hazard": "hazards",
    "decoration": "decorations",
    "background": "background",
    "marker": "markers",
}

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


class TokenCompileError(Exception):
    def __init__(self, source: Path, message: str) -> None:
        super().__init__(f"{source}: {message}")
        self.source = source
        self.message = message


@dataclass
class CompiledToken:
    id: str
    biome: str
    category: str
    kind: str                                # "terrain" | "dynamic"
    footprint: tuple[int, int]
    anchor: str
    layers: list[str]
    gameplay: dict[str, Any]
    visual: dict[str, Any]
    sketch_file: str
    sketch_size_px: tuple[int, int]
    source: str

    def to_json(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "biome": self.biome,
            "category": self.category,
            "kind": self.kind,
            "footprint": list(self.footprint),
            "anchor": self.anchor,
            "layers": self.layers,
            "gameplay": self.gameplay,
            "visual": self.visual,
            "sketch_file": self.sketch_file,
            "sketch_size_px": list(self.sketch_size_px),
            "source": self.source,
        }


def _validate_sketch_png(source: Path, sketch_path: Path, sw: int, sh: int) -> None:
    """Enforce that the sketch PNG opens cleanly, has the declared
    dimensions (within ±2 px tolerance for generator drift), and carries
    an alpha channel so the stamper's transparent-bg assumption holds.
    """
    if sketch_path.suffix.lower() != ".png":
        raise TokenCompileError(
            source,
            f"sketch.file must be a .png (got {sketch_path.name}). "
            f"Run scripts/generate_token_concepts.py to produce concept images.",
        )
    try:
        from PIL import Image
    except ImportError:
        raise TokenCompileError(
            source, "Pillow not installed — pip install -r scripts/requirements.txt"
        )
    try:
        img = Image.open(sketch_path)
        img.load()
    except Exception as e:
        raise TokenCompileError(source, f"sketch {sketch_path.name} could not be opened: {e}")

    aw, ah = img.size
    if abs(aw - sw) > 2 or abs(ah - sh) > 2:
        raise TokenCompileError(
            source,
            f"sketch {sketch_path.name} is {aw}x{ah} but sketch.size_px declares {sw}x{sh}. "
            f"Re-run scripts/generate_token_concepts.py --force or update size_px.",
        )

    if img.mode not in ("RGBA", "LA"):
        raise TokenCompileError(
            source,
            f"sketch {sketch_path.name} mode is {img.mode!r}; expected RGBA "
            f"(painter relies on the alpha channel for transparent backgrounds).",
        )


def find_project_root(start: Path | None = None) -> Path:
    cur = (start or Path(__file__)).resolve()
    while True:
        if (cur / "assets" / "tokens").is_dir():
            return cur
        if cur.parent == cur:
            raise FileNotFoundError("could not locate project root (no assets/tokens/ found)")
        cur = cur.parent


def parse_token(source: Path, project_root: Path) -> CompiledToken:
    text = source.read_text(encoding="utf-8")
    fm_match = FRONTMATTER_RE.match(text)
    if not fm_match:
        raise TokenCompileError(source, "missing frontmatter (--- ... ---)")
    try:
        fm = yaml.safe_load(fm_match.group(1)) or {}
    except yaml.YAMLError as e:
        raise TokenCompileError(source, f"invalid YAML frontmatter: {e}") from e

    for required in ("id", "biome", "category", "body", "layers", "sketch"):
        if required not in fm:
            raise TokenCompileError(source, f"missing required key '{required}'")

    token_id = str(fm["id"]).strip()
    biome = str(fm["biome"]).strip()
    category = str(fm["category"]).strip()
    if category not in VALID_CATEGORIES:
        raise TokenCompileError(
            source, f"category '{category}' not in {sorted(VALID_CATEGORIES)}"
        )

    # Per-asset folder layout: source path is .../{category}/{token-id}/token.md.
    # The category folder is two levels up from the MD; the asset folder
    # (`source.parent.name`) carries the token id.
    expected_folder = CATEGORY_TO_FOLDER[category]
    actual_category_folder = source.parent.parent.name
    if actual_category_folder != expected_folder:
        raise TokenCompileError(
            source,
            f"category '{category}' requires folder '{expected_folder}/', "
            f"but file is in '{actual_category_folder}/'. Move it to "
            f"assets/tokens/{biome}/{expected_folder}/{source.parent.name}/{source.name}.",
        )

    # Folder name must match the token id so paths stay self-describing.
    asset_folder = source.parent.name
    if asset_folder != token_id:
        raise TokenCompileError(
            source,
            f"token id '{token_id}' must match its containing folder name "
            f"(got folder '{asset_folder}/'). Rename the folder or fix the id.",
        )

    kind = str(fm.get("kind", "terrain")).strip()
    if kind not in VALID_KINDS:
        raise TokenCompileError(
            source, f"kind '{kind}' not in {sorted(VALID_KINDS)} "
            f"(omit for default 'terrain'; use 'dynamic' for engine-driven sprites)"
        )

    body = fm["body"]
    if not isinstance(body, dict):
        raise TokenCompileError(source, "body must be a mapping")
    fp = body.get("footprint")
    if not isinstance(fp, dict) or "width" not in fp or "height" not in fp:
        raise TokenCompileError(source, "body.footprint must be {width, height}")
    fw, fh = int(fp["width"]), int(fp["height"])
    if fw <= 0 or fh <= 0:
        raise TokenCompileError(source, f"footprint must be positive, got {fw}x{fh}")
    anchor = str(body.get("anchor", "bottom-left"))
    if anchor not in VALID_ANCHORS:
        raise TokenCompileError(source, f"anchor '{anchor}' not in {sorted(VALID_ANCHORS)}")

    layers = fm.get("layers")
    if not isinstance(layers, list) or not layers:
        raise TokenCompileError(source, "layers must be a non-empty list")
    for layer in layers:
        if layer not in VALID_LAYERS:
            raise TokenCompileError(source, f"layer '{layer}' not in {sorted(VALID_LAYERS)}")

    gameplay_default = {"passable": False, "damage": 0, "beats": []}
    gameplay = {**gameplay_default, **(fm.get("gameplay") or {})}

    visual = fm.get("visual") or {}
    if "fill" in visual and not re.match(r"^#[0-9A-Fa-f]{6}$", str(visual["fill"])):
        raise TokenCompileError(source, f"visual.fill must be #RRGGBB, got {visual['fill']!r}")
    if "detail_density" in visual and visual["detail_density"] not in VALID_DETAIL_DENSITIES:
        raise TokenCompileError(
            source,
            f"visual.detail_density must be in {sorted(VALID_DETAIL_DENSITIES)}",
        )
    if "symbol" not in visual:
        raise TokenCompileError(
            source,
            "visual.symbol is required (single ASCII char for layer-mapping grids)",
        )
    sym = str(visual["symbol"])
    if len(sym) != 1:
        raise TokenCompileError(
            source,
            f"visual.symbol must be exactly one character, got {sym!r} ({len(sym)} chars)",
        )
    if sym in RESERVED_SYMBOLS:
        raise TokenCompileError(
            source,
            f"visual.symbol {sym!r} is reserved (`.` empty, whitespace, backtick)",
        )

    sketch = fm["sketch"]
    if not isinstance(sketch, dict) or "file" not in sketch:
        raise TokenCompileError(source, "sketch must include 'file'")
    sketch_file = str(sketch["file"])
    sketch_path = source.parent / sketch_file
    if not sketch_path.exists():
        raise TokenCompileError(source, f"sketch file not found: {sketch_path}")

    size = sketch.get("size_px") or [LONG_SIDE_PX, LONG_SIDE_PX]
    if not (isinstance(size, list) and len(size) == 2):
        raise TokenCompileError(source, "sketch.size_px must be [width, height]")
    sw, sh = int(size[0]), int(size[1])
    if sw <= 0 or sh <= 0:
        raise TokenCompileError(source, f"sketch.size_px must be positive, got {sw}x{sh}")

    # The PNG concept's aspect ratio must match the token's footprint
    # (within 5%). Exact resolution is the generator's choice; aspect
    # is the structural contract — a wide pond must read wide, etc.
    expected_aspect = fw / fh
    actual_aspect = sw / sh
    if abs(actual_aspect - expected_aspect) / expected_aspect > 0.05:
        raise TokenCompileError(
            source,
            f"sketch.size_px aspect {sw}:{sh} (={actual_aspect:.3f}) does not match "
            f"footprint {fw}:{fh} (={expected_aspect:.3f}). "
            f"Re-run scripts/generate_token_concepts.py --force.",
        )

    _validate_sketch_png(source, sketch_path, sw, sh)

    return CompiledToken(
        id=token_id,
        biome=biome,
        category=category,
        kind=kind,
        footprint=(fw, fh),
        anchor=anchor,
        layers=list(layers),
        gameplay=gameplay,
        visual=visual,
        sketch_file=sketch_file,
        sketch_size_px=(sw, sh),
        source=source.relative_to(project_root).as_posix(),
    )


def compile_biome(biome_dir: Path, project_root: Path, *, write: bool) -> tuple[list[CompiledToken], list[TokenCompileError]]:
    tokens: list[CompiledToken] = []
    errors: list[TokenCompileError] = []
    seen_ids: set[str] = set()

    # Per-asset folder layout: each token lives in
    # `{biome}/{category}/{token-id}/token.md`. Walk for `token.md` only
    # so spec docs (SCHEMA.md, TOKENS_SPEC.md, ASSEMBLY.md) and PREVIEW.md
    # at the biome level are naturally excluded.
    for md in sorted(biome_dir.rglob("token.md")):
        try:
            token = parse_token(md, project_root)
        except TokenCompileError as e:
            errors.append(e)
            continue
        if token.id in seen_ids:
            errors.append(TokenCompileError(md, f"duplicate token id '{token.id}' in biome"))
            continue
        seen_ids.add(token.id)
        tokens.append(token)

    by_layer_kind_symbol: dict[str, dict[str, dict[str, str]]] = {}
    for t in tokens:
        sym = str(t.visual.get("symbol", ""))
        for layer in t.layers:
            ls = by_layer_kind_symbol.setdefault(layer, {}).setdefault(t.kind, {})
            if sym in ls:
                other_id = ls[sym]
                other_src = next((x.source for x in tokens if x.id == other_id), other_id)
                errors.append(TokenCompileError(
                    Path(t.source) if Path(t.source).is_absolute() else (project_root / t.source),
                    f"symbol {sym!r} duplicated on layer '{layer}' (kind={t.kind}): "
                    f"both '{t.id}' and '{other_id}' (see {other_src}) use it. "
                    f"Pick a different symbol for one of them.",
                ))
                continue
            ls[sym] = t.id

    if errors:
        return tokens, errors

    if write:
        for t in tokens:
            out = (project_root / t.source).with_suffix(".json")
            out.write_text(json.dumps(t.to_json(), indent=2) + "\n", encoding="utf-8")

        index = {
            "biome": biome_dir.name,
            "tokens": [
                {
                    "id": t.id,
                    "category": t.category,
                    "kind": t.kind,
                    "footprint": list(t.footprint),
                    "anchor": t.anchor,
                    "layers": t.layers,
                    "symbol": str(t.visual.get("symbol", "")),
                    "sketch_file": t.sketch_file,
                    "source": t.source,
                }
                for t in sorted(tokens, key=lambda t: t.id)
            ],
            "by_layer_kind": {
                layer: {kind: dict(syms) for kind, syms in sorted(kinds.items())}
                for layer, kinds in sorted(by_layer_kind_symbol.items())
            },
        }
        (biome_dir / "index.json").write_text(
            json.dumps(index, indent=2) + "\n", encoding="utf-8"
        )

    return tokens, errors


def main() -> int:
    p = argparse.ArgumentParser(description="Compile token MD → JSON for a biome")
    p.add_argument("biome", nargs="?")
    p.add_argument("--check", action="store_true")
    args = p.parse_args()

    project_root = find_project_root()
    tokens_dir = project_root / "assets" / "tokens"
    targets = (
        [tokens_dir / args.biome]
        if args.biome
        else [d for d in sorted(tokens_dir.iterdir()) if d.is_dir()]
    )

    total_ok = 0
    total_err = 0
    for biome_dir in targets:
        if not biome_dir.is_dir():
            print(f"error: {biome_dir} not a directory", file=sys.stderr)
            total_err += 1
            continue
        tokens, errors = compile_biome(biome_dir, project_root, write=not args.check)
        for e in errors:
            print(f"FAIL {e}", file=sys.stderr)
        if tokens:
            verb = "validated" if args.check else "compiled"
            print(f"{biome_dir.name}: {verb} {len(tokens)} tokens")
        total_ok += len(tokens)
        total_err += len(errors)

    print(f"\nTotal: {total_ok} ok, {total_err} failed")
    return 0 if total_err == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
