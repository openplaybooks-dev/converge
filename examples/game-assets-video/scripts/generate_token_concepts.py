#!/usr/bin/env python3
"""generate_token_concepts.py — Render per-token painted concept art.

The prompt is the single source of truth. Each token folder must
contain a `prompt.md` authored by the user — this script reads it
verbatim and dispatches to the image-gen backend with NO build-time
prompt assembly, NO reference images, NO hidden injection of
game.json / ART_BIBLE / camera config.

Cached on `{token}/concept.png` existence — pass --force to regenerate.

Usage:
  python scripts/generate_token_concepts.py                    # all biomes
  python scripts/generate_token_concepts.py grassland          # one biome
  python scripts/generate_token_concepts.py grassland bush     # one token
  python scripts/generate_token_concepts.py --force            # re-render
  python scripts/generate_token_concepts.py --dry-run          # print prompt + size, skip API
"""

from __future__ import annotations

import argparse
import io
import re
import sys
from pathlib import Path

import yaml
from PIL import Image

from lib import budget
from lib.image_api import generate_image, active_backend
from lib.matting import matte_in_place
from lib.sprite import find_project_root


LONG_SIDE_PX = 1024

FRONTMATTER_RE = re.compile(r"^(---\s*\n)(.*?)(\n---\s*\n)", re.DOTALL)


def discover_biomes(project_root: Path) -> list[str]:
    """Read game.json for the biome list. Falls back to ['grassland']."""
    import json as _json
    p = project_root / "assets" / "game.json"
    if not p.exists():
        return ["grassland"]
    try:
        data = _json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return ["grassland"]
    biomes = data.get("biomes")
    if isinstance(biomes, list) and biomes:
        return [str(b) if isinstance(b, str) else str(b.get("id")) for b in biomes]
    return ["grassland"]


def list_token_mds(project_root: Path, biome: str, only_id: str | None = None) -> list[Path]:
    """Per-asset folder layout: tokens live in `{biome}/{cat}/{id}/token.md`."""
    biome_dir = project_root / "assets" / "tokens" / biome
    if not biome_dir.is_dir():
        return []
    mds = []
    for md in sorted(biome_dir.rglob("token.md")):
        token_id = md.parent.name
        if only_id and token_id != only_id:
            continue
        mds.append(md)
    return mds


def parse_frontmatter(md_path: Path) -> dict:
    text = md_path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        raise ValueError(f"{md_path}: no YAML frontmatter")
    return yaml.safe_load(m.group(2)) or {}


def compute_dims(footprint_w: int, footprint_h: int) -> tuple[int, int, str]:
    """Return (W, H, aspect_ratio_str). Long side fixed at LONG_SIDE_PX;
    short side scales by aspect (no floor — true aspect is preserved)."""
    if footprint_w >= footprint_h:
        w = LONG_SIDE_PX
        h = max(1, round(LONG_SIDE_PX * footprint_h / footprint_w))
    else:
        h = LONG_SIDE_PX
        w = max(1, round(LONG_SIDE_PX * footprint_w / footprint_h))
    aspect = f"{footprint_w}:{footprint_h}"
    return w, h, aspect


def validate_concept_png(png_bytes: bytes, expected_w: int, expected_h: int) -> tuple[bool, str]:
    try:
        img = Image.open(io.BytesIO(png_bytes))
        img.load()
    except Exception as e:
        return False, f"could not open PNG: {e}"

    w, h = img.size
    if abs(w - expected_w) > 2 or abs(h - expected_h) > 2:
        return False, f"size mismatch: got {w}x{h}, expected {expected_w}x{expected_h}"

    expected_aspect = expected_w / expected_h
    actual_aspect = w / h
    if abs(actual_aspect - expected_aspect) / expected_aspect > 0.05:
        return False, (
            f"aspect mismatch: got {actual_aspect:.3f} ({w}x{h}), "
            f"expected {expected_aspect:.3f} ({expected_w}x{expected_h})"
        )

    return True, ""


def rewrite_md_sketch_block(md_path: Path, png_filename: str, w: int, h: int) -> None:
    """Update sketch.file and sketch.size_px in the token MD frontmatter."""
    text = md_path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        raise ValueError(f"{md_path}: no frontmatter to rewrite")
    head, yaml_text, tail = m.group(1), m.group(2), m.group(3)
    rest = text[m.end():]

    new_yaml = re.sub(
        r"(?m)^(\s*file:\s*)\S+",
        rf"\g<1>{png_filename}",
        yaml_text,
        count=1,
    )
    new_yaml = re.sub(
        r"(?m)^(\s*size_px:\s*)\[\s*\d+\s*,\s*\d+\s*\]",
        rf"\g<1>[{w}, {h}]",
        new_yaml,
        count=1,
    )
    md_path.write_text(head + new_yaml + tail + rest, encoding="utf-8")


def render_one(
    *,
    md_path: Path,
    project_root: Path,
    force: bool,
    dry_run: bool,
) -> bool:
    """Read token.md for footprint, prompt.md for the prompt, and dispatch.
    Returns True on success / cached, False on failure."""
    fm = parse_frontmatter(md_path)
    token_id = fm.get("id") or md_path.parent.name
    biome = fm.get("biome", "grassland")
    body = fm.get("body") or {}
    footprint_dict = body.get("footprint") or {}
    fw = int(footprint_dict.get("width", 1))
    fh = int(footprint_dict.get("height", 1))

    asset_dir = md_path.parent
    prompt_path = asset_dir / "prompt.md"
    png_path = asset_dir / "concept.png"
    seed_path = asset_dir / "seed.txt"

    if not prompt_path.exists():
        print(
            f"  [{biome}/{token_id}] FAIL: {prompt_path.relative_to(project_root)} "
            f"is missing. Author the prompt before generating.",
            file=sys.stderr,
        )
        return False

    prompt = prompt_path.read_text(encoding="utf-8")

    if png_path.exists() and not force:
        print(
            f"  [{biome}/{token_id}] skip ({png_path.relative_to(project_root)} "
            f"already exists, pass --force to regenerate)",
            file=sys.stderr,
        )
        return True

    target_w, target_h, aspect = compute_dims(fw, fh)

    if dry_run:
        print(
            f"\n--- DRY-RUN [{biome}/{token_id}] ({len(prompt)} chars, "
            f"target {target_w}x{target_h}, aspect {aspect}) ---",
            file=sys.stderr,
        )
        print(prompt[:1500] + ("\n...[truncated]" if len(prompt) > 1500 else ""), file=sys.stderr)
        return True

    backend = active_backend()
    cost = budget.cost_for_image(backend)
    print(
        f"  [{biome}/{token_id}] generating {target_w}x{target_h} concept "
        f"backend={backend} cost={cost}c",
        file=sys.stderr,
    )

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"token-concept {biome}/{token_id}",
    ):
        # Strict text-to-image — no reference images attached.
        img_bytes, used_seed = generate_image(
            prompt,
            reference_paths=None,
            aspect_ratio=aspect,
            resolution=(target_w, target_h),
        )

    ok, reason = validate_concept_png(img_bytes, target_w, target_h)
    if not ok:
        print(
            f"  [{biome}/{token_id}] FAIL: output validation failed: {reason}",
            file=sys.stderr,
        )
        return False

    # Save raw output, then post-process.
    png_path.write_bytes(img_bytes)
    seed_path.write_text(str(used_seed), encoding="utf-8")

    # Chroma-key matte unless the model already returned alpha.
    saved = Image.open(png_path).convert("RGBA")
    saved_alpha = saved.split()[-1]
    alpha_min, _ = saved_alpha.getextrema()
    if alpha_min < 250:
        print(
            f"  [{biome}/{token_id}] model returned alpha; skipping matte step",
            file=sys.stderr,
        )
    else:
        try:
            bg_used, regime = matte_in_place(png_path, bg_color=None, regime="auto")
            print(
                f"  [{biome}/{token_id}] matted (bg={tuple(int(c) for c in bg_used)}, "
                f"regime={regime})",
                file=sys.stderr,
            )
        except Exception as e:
            print(
                f"  [{biome}/{token_id}] WARNING: matte step failed ({e}); "
                f"keeping non-keyed PNG.",
                file=sys.stderr,
            )

    actual_w, actual_h = Image.open(png_path).size
    rewrite_md_sketch_block(md_path, "concept.png", actual_w, actual_h)

    print(
        f"  [{biome}/{token_id}] wrote {png_path.relative_to(project_root)} "
        f"({actual_w}x{actual_h}, seed={used_seed})",
        file=sys.stderr,
    )
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("biome", nargs="?", help="biome name; omit for all biomes")
    ap.add_argument("token", nargs="?", help="token id; omit for all tokens in the biome")
    ap.add_argument("--force", action="store_true", help="re-render even if concept.png exists")
    ap.add_argument("--dry-run", action="store_true", help="print prompt + size, skip API call")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    biomes = [args.biome] if args.biome else discover_biomes(project_root)
    print(
        f"generate_token_concepts: {len(biomes)} biome(s): {biomes}"
        + (f" (token={args.token})" if args.token else ""),
        file=sys.stderr,
    )

    total_ok = 0
    total_fail = 0
    for biome in biomes:
        mds = list_token_mds(project_root, biome, args.token)
        if not mds:
            print(f"  [{biome}] no token MDs found", file=sys.stderr)
            continue

        for md in mds:
            try:
                if render_one(
                    md_path=md,
                    project_root=project_root,
                    force=args.force,
                    dry_run=args.dry_run,
                ):
                    total_ok += 1
                else:
                    total_fail += 1
            except SystemExit:
                raise
            except Exception as e:
                print(f"  [{biome}/{md.parent.name}] EXCEPTION: {e}", file=sys.stderr)
                total_fail += 1

    print(f"\ngenerate_token_concepts: {total_ok} ok, {total_fail} failed", file=sys.stderr)
    return 0 if total_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
