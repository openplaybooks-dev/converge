#!/usr/bin/env python3
"""tokens_validate.py — lint a biome's tokens library for sketch contract.

Standalone validation focused on the PNG concept image contract:
  - sketch.file is a .png that opens cleanly
  - PNG dimensions match sketch.size_px (±2 px tolerance)
  - PNG carries an alpha channel (RGBA / LA mode)
  - sketch.size_px aspect ratio matches footprint aspect (±5%)

This is the same check the compiler enforces, surfaced as a fast lint
pass that walks every token and reports ALL violations in one go
(`tokens_compile.py` aborts the token on first error).

Usage:
  python scripts/tokens_validate.py                # every biome
  python scripts/tokens_validate.py grassland      # one biome
  python scripts/tokens_validate.py --quiet        # only print failures
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml


FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def find_project_root(start: Path | None = None) -> Path:
    cur = (start or Path(__file__)).resolve()
    while True:
        if (cur / "assets" / "tokens").is_dir():
            return cur
        if cur.parent == cur:
            raise FileNotFoundError("could not locate project root (no assets/tokens/ found)")
        cur = cur.parent


def parse_frontmatter(md_path: Path) -> dict:
    text = md_path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        raise ValueError(f"{md_path}: missing frontmatter")
    return yaml.safe_load(m.group(1))


def validate_token(md_path: Path) -> list[str]:
    """Return a list of human-readable violations (empty if the token is clean)."""
    violations: list[str] = []

    try:
        fm = parse_frontmatter(md_path)
    except Exception as e:
        return [f"frontmatter parse error: {e}"]

    body = fm.get("body") or {}
    fp = body.get("footprint") or {}
    fw = fp.get("width")
    fh = fp.get("height")
    if not (isinstance(fw, int) and isinstance(fh, int) and fw > 0 and fh > 0):
        return [f"body.footprint must be {{width, height}} positive integers, got {fp!r}"]

    sketch = fm.get("sketch") or {}
    sketch_file = sketch.get("file")
    size = sketch.get("size_px")
    if not sketch_file:
        return ["sketch.file is missing"]
    if not (isinstance(size, list) and len(size) == 2):
        return [f"sketch.size_px must be [width, height], got {size!r}"]
    sw, sh = int(size[0]), int(size[1])

    sketch_path = md_path.parent / sketch_file
    if not sketch_path.exists():
        violations.append(f"sketch file not found: {sketch_path.name}")
        return violations

    if sketch_path.suffix.lower() != ".png":
        violations.append(
            f"{sketch_file}: must be .png; SVG sketches are no longer supported. "
            f"Run scripts/generate_token_concepts.py to render concept images."
        )
        return violations

    # Aspect-match check: sketch.size_px aspect must match footprint aspect within 5%.
    expected_aspect = fw / fh
    declared_aspect = sw / sh
    if abs(declared_aspect - expected_aspect) / expected_aspect > 0.05:
        violations.append(
            f"sketch.size_px {sw}x{sh} aspect {declared_aspect:.3f} does not match "
            f"footprint {fw}x{fh} aspect {expected_aspect:.3f} (>5% drift)"
        )

    # Open the actual PNG and confirm dimensions + alpha.
    try:
        from PIL import Image
    except ImportError:
        violations.append("Pillow not installed — pip install -r scripts/requirements.txt")
        return violations
    try:
        img = Image.open(sketch_path)
        img.load()
    except Exception as e:
        violations.append(f"{sketch_file}: could not open: {e}")
        return violations

    aw, ah = img.size
    if abs(aw - sw) > 2 or abs(ah - sh) > 2:
        violations.append(
            f"{sketch_file}: PNG is {aw}x{ah} but sketch.size_px declares {sw}x{sh} (>2 px drift)"
        )

    if img.mode not in ("RGBA", "LA"):
        violations.append(
            f"{sketch_file}: image mode is {img.mode!r}; expected RGBA "
            f"(painter relies on the alpha channel)"
        )

    return violations


def validate_biome(biome_dir: Path, quiet: bool) -> tuple[int, int]:
    biome = biome_dir.name
    # Per-asset folder layout: each token lives in
    # `{biome}/{category}/{token-id}/token.md`. Walk for `token.md` only
    # so spec/PREVIEW MDs at higher levels are naturally excluded.
    md_files = sorted(biome_dir.rglob("token.md"))

    ok = 0
    failed = 0
    for md in md_files:
        violations = validate_token(md)
        if violations:
            failed += 1
            print(f"FAIL {md.relative_to(biome_dir.parent.parent)}", file=sys.stderr)
            for v in violations:
                print(f"  - {v}", file=sys.stderr)
        else:
            ok += 1
            if not quiet:
                print(f"ok   {md.relative_to(biome_dir.parent.parent)}")

    print(f"{biome}: {ok} ok, {failed} failed")
    return ok, failed


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    ap.add_argument("biome", nargs="?", help="biome name (default: validate all)")
    ap.add_argument("-q", "--quiet", action="store_true", help="only print failures")
    args = ap.parse_args()

    project_root = find_project_root()
    tokens_root = project_root / "assets" / "tokens"
    if not tokens_root.is_dir():
        print(f"error: no assets/tokens/ at {project_root}", file=sys.stderr)
        return 2

    if args.biome:
        biome_dir = tokens_root / args.biome
        if not biome_dir.is_dir():
            print(f"error: biome not found: {biome_dir}", file=sys.stderr)
            return 2
        biome_dirs = [biome_dir]
    else:
        biome_dirs = sorted(p for p in tokens_root.iterdir() if p.is_dir())

    total_ok = 0
    total_failed = 0
    for biome_dir in biome_dirs:
        ok, failed = validate_biome(biome_dir, args.quiet)
        total_ok += ok
        total_failed += failed

    print(f"\nTotal: {total_ok} ok, {total_failed} failed")
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
