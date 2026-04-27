#!/usr/bin/env python3
"""
compose_video_atlas.py — Write a frames-mode atlas for the video pipeline.

Once the per-state video has been split into individual frame PNGs, the
spritesheet step is just a packed copy of the same data — pure overhead.
This script writes ONLY the atlas JSON, pointing it at the existing frames
under `assets/characters/{char_id}/videos/{state}/frames/`.

The atlas declares `meta.mode = "frames"` so build_master_atlas.py knows
to read per-frame paths instead of pixel rects inside a sheet PNG.

Usage:
  python scripts/compose_video_atlas.py <char_id> <state>

Outputs:
  assets/characters/{char_id}/spritesheets/{state}/{state}.atlas.json
  assets/characters/{char_id}/spritesheets/{state}/{state}.prompt.txt
  assets/characters/{char_id}/spritesheets/{state}/{state}.seed.txt
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

from lib.keyframes import playback_for_state
from lib.sprite import find_project_root


EXPECTED_FRAMES = 24  # 1 second of motion at 24 fps; matches extract_video_frames default


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id")
    ap.add_argument("state")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    frames_dir = project_root / "assets" / "characters" / args.char_id / "videos" / args.state / "frames"
    if not frames_dir.exists():
        raise SystemExit(
            f"Frames directory not found: {frames_dir}\n"
            f"Run first: python scripts/extract_video_frames.py {args.char_id} {args.state}"
        )

    frame_paths = sorted(frames_dir.glob(f"{args.state}_*.png"))
    if len(frame_paths) < EXPECTED_FRAMES:
        raise SystemExit(
            f"Expected {EXPECTED_FRAMES} frames in {frames_dir}, found {len(frame_paths)}."
        )
    frame_paths = frame_paths[:EXPECTED_FRAMES]

    # Probe one frame for the atlas size metadata.
    first = Image.open(frame_paths[0])
    frame_w, frame_h = first.size

    out_dir = project_root / "assets" / "characters" / args.char_id / "spritesheets" / args.state
    out_dir.mkdir(parents=True, exist_ok=True)
    atlas_path = out_dir / f"{args.state}.atlas.json"
    prompt_dest = out_dir / f"{args.state}.prompt.txt"
    seed_dest = out_dir / f"{args.state}.seed.txt"

    # Carry video prompt + seed for parity with the image-gen layout.
    video_dir = project_root / "assets" / "characters" / args.char_id / "videos" / args.state
    video_prompt = video_dir / f"{args.state}.prompt.txt"
    video_seed = video_dir / f"{args.state}.seed.txt"
    if video_prompt.exists():
        shutil.copy2(video_prompt, prompt_dest)
    else:
        prompt_dest.write_text("(video prompt unavailable)\n", encoding="utf-8")
    seed_value = video_seed.read_text(encoding="utf-8").strip() if video_seed.exists() else ""
    seed_dest.write_text(seed_value, encoding="utf-8")

    playback = playback_for_state(args.state)
    frames_dir_rel = frames_dir.relative_to(project_root).as_posix()
    # Frame count + playback rate together define cycle duration. 24 frames
    # at 24 fps = 1.0s loop, which matches the per-state video pipeline. The
    # state-specific yoyo flag from STATE_PLAYBACK is still respected (idle
    # yoyos, walk does not).
    cycle_fps = EXPECTED_FRAMES  # 24 frames -> 24 fps -> 1s cycle
    atlas = {
        "meta": {
            "mode": "frames",
            "char_id": args.char_id,
            "state": args.state,
            "frame_count": EXPECTED_FRAMES,
            "frame_size": {"w": frame_w, "h": frame_h},
            "frame_order": "left-to-right, top-to-bottom",
            "frames_dir": frames_dir_rel,
            "frameRate": cycle_fps,
            "yoyo": playback["yoyo"],
            "seed": seed_value,
            "source": "video",
        },
        "frames": [
            {
                "filename": p.name,
                "path": p.relative_to(project_root).as_posix(),
            }
            for p in frame_paths
        ],
    }
    atlas_path.write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    print(
        f"[{args.char_id}] wrote frames-mode atlas "
        f"{atlas_path.relative_to(project_root)} "
        f"({EXPECTED_FRAMES} frames @ {frames_dir_rel})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
