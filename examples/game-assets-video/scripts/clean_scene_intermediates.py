#!/usr/bin/env python3
"""clean_scene_intermediates.py — delete debug breadcrumbs under assets/scenes/.

The scene pipeline keeps three classes of debug-only files alongside the
final outputs:

  - per-bg-layer segments:  assets/scenes/<id>/bg-<layer>/segments/*.png
        Each parallax bg is N image-gen calls stitched into the final
        bg-<layer>.png. The segments/ dir is the per-call intermediates
        plus the right-edge slice handed to the next call as a reference.
        ~5 MB per layer.

  - per-tile sources:       assets/scenes/<id>/tilesheet/tiles/<tile>/<tile>.png
        Each tile is generated as its own image, then build_tilesheet.py
        composites them into tilesheet.png. ~30-40 KB per tile.

  - prompt + seed sidecars: *.prompt.txt, *.seed.txt
        Every paid call writes the prompt that was sent and the seed used,
        sidecar to the output. Lets you re-run with --seed N to reproduce
        without paying again. ~1 KB each.

By default this script reports what would be deleted (--dry-run is the
default). Pass --apply to actually remove the files.

Usage:
  python scripts/clean_scene_intermediates.py             # dry-run, all scenes
  python scripts/clean_scene_intermediates.py forest-1    # dry-run, one scene
  python scripts/clean_scene_intermediates.py --apply
  python scripts/clean_scene_intermediates.py --apply --keep-prompts
  python scripts/clean_scene_intermediates.py --apply --segments-only
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from lib.sprite import find_project_root


def find_scene_dirs(project_root: Path, scene_filter: str | None) -> list[Path]:
    base = project_root / "assets" / "scenes"
    if not base.exists():
        return []
    dirs = sorted(d for d in base.iterdir() if d.is_dir())
    if scene_filter:
        dirs = [d for d in dirs if d.name == scene_filter]
    return dirs


def collect_targets(
    scene_dir: Path,
    *,
    drop_segments: bool,
    drop_per_tile: bool,
    drop_sidecars: bool,
) -> list[Path]:
    """Walk one scene dir and return every path we'd remove."""
    targets: list[Path] = []

    if drop_segments:
        for layer_dir in scene_dir.glob("bg-*"):
            seg_dir = layer_dir / "segments"
            if seg_dir.is_dir():
                targets.append(seg_dir)
            elif layer_dir.is_dir() and not any(layer_dir.iterdir()):
                # Empty layer dir (no segments anyway) — keep it; harmless.
                pass

    if drop_per_tile:
        tiles_dir = scene_dir / "tilesheet" / "tiles"
        if tiles_dir.is_dir():
            targets.append(tiles_dir)

    if drop_sidecars:
        for sidecar in scene_dir.rglob("*.prompt.txt"):
            targets.append(sidecar)
        for sidecar in scene_dir.rglob("*.seed.txt"):
            targets.append(sidecar)

    return targets


def human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def path_size(p: Path) -> int:
    if p.is_file():
        return p.stat().st_size
    if p.is_dir():
        return sum(f.stat().st_size for f in p.rglob("*") if f.is_file())
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id", nargs="?", default=None,
                    help="Scope to one scene (default: all scenes under assets/scenes/)")
    ap.add_argument("--apply", action="store_true",
                    help="Actually delete (default is dry-run)")
    ap.add_argument("--segments-only", action="store_true",
                    help="Drop only bg segments, keep per-tile + sidecars")
    ap.add_argument("--keep-prompts", action="store_true",
                    help="Keep .prompt.txt / .seed.txt sidecars")
    ap.add_argument("--keep-tiles", action="store_true",
                    help="Keep per-tile source PNGs (tilesheet/tiles/<id>/)")
    args = ap.parse_args()

    drop_segments = True
    drop_per_tile = not (args.segments_only or args.keep_tiles)
    drop_sidecars = not (args.segments_only or args.keep_prompts)

    project_root = find_project_root(Path.cwd())
    scene_dirs = find_scene_dirs(project_root, args.scene_id)
    if not scene_dirs:
        if args.scene_id:
            print(f"No scene named '{args.scene_id}' under assets/scenes/", file=sys.stderr)
            return 1
        print("No scenes under assets/scenes/ — nothing to clean.")
        return 0

    total_bytes = 0
    total_files = 0
    print(f"{'PLAN' if not args.apply else 'APPLY'}: cleanup mode")
    print(f"  drop_segments={drop_segments} drop_per_tile={drop_per_tile} drop_sidecars={drop_sidecars}")
    print()

    for scene_dir in scene_dirs:
        targets = collect_targets(
            scene_dir,
            drop_segments=drop_segments,
            drop_per_tile=drop_per_tile,
            drop_sidecars=drop_sidecars,
        )
        if not targets:
            continue
        scene_total = sum(path_size(t) for t in targets)
        scene_files = sum(1 for t in targets if t.is_file()) + sum(
            1 for t in targets if t.is_dir() for _ in t.rglob("*") if _.is_file()
        )
        total_bytes += scene_total
        total_files += scene_files
        rel = scene_dir.relative_to(project_root)
        print(f"  {rel}  ({scene_files} file(s), {human_size(scene_total)})")
        for t in targets:
            kind = "DIR " if t.is_dir() else "FILE"
            print(f"    {kind} {t.relative_to(project_root)}")
            if args.apply:
                if t.is_dir():
                    shutil.rmtree(t)
                else:
                    t.unlink(missing_ok=True)
        print()

    verb = "Removed" if args.apply else "Would remove"
    print(f"{verb}: {total_files} file(s), {human_size(total_bytes)}")
    if not args.apply:
        print("Re-run with --apply to actually delete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
