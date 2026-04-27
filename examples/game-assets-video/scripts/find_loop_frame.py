#!/usr/bin/env python3
"""find_loop_frame.py — CLI wrapper around lib.loop_frame.find_loop_in_video.

Decode every frame of an mp4 and report the best loop point as JSON. Used
for verification + ad-hoc debugging; the production pipeline calls
lib.loop_frame directly from extract_video_frames.

Usage:
  python scripts/find_loop_frame.py <video.mp4> [--skip 10] [--min-gap 5]

Output (JSON to stdout):
  {"loop_frame": <int>, "similarity": <float>, "window": 7|1|0,
   "total_frames": <int>, "fps": <float>, "loop_seconds": <float>}
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib.loop_frame import find_loop_in_video


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("video", help="Path to mp4 (or any ffmpeg-readable container)")
    ap.add_argument("--skip", type=int, default=10)
    ap.add_argument("--min-gap", type=int, default=5)
    args = ap.parse_args()

    video_path = Path(args.video)
    if not video_path.exists():
        print(json.dumps({"error": f"video not found: {video_path}"}))
        return 1

    result, fps = find_loop_in_video(
        video_path,
        skip=args.skip,
        min_gap=args.min_gap,
    )

    out = {
        "loop_frame": result.loop_frame,
        "similarity": result.similarity,
        "window": result.window,
        "total_frames": result.total_frames,
        "fps": round(fps, 3),
        "loop_seconds": round(result.loop_frame / fps, 3) if fps else None,
    }
    if not result.found:
        out["note"] = "no good loop point found, using whole clip"
    print(json.dumps(out, indent=2))

    if result.peaks:
        print("\nTop peaks (latest first):", file=sys.stderr)
        for i, (idx, sim) in enumerate(result.peaks[:5]):
            tag = " <-- chosen" if (idx + 1) == result.loop_frame else ""
            print(f"  #{i+1} frame {idx+1}  sim={sim:.4f}{tag}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
