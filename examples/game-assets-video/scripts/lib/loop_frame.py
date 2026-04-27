"""Loop-point detection for generated video clips.

Ported from godogen (https://github.com/htdt/godogen — `shared/skills/godogen/
tools/find_loop_frame.py`). Original strategy:

  1. Embed every frame as a 32×32 RGB vector, L2-normalized.
  2. For each candidate start S (skipping the first N frames), measure mean
     dot-product similarity over a 7-frame window vs frames [0..6].
  3. Keep top-K by similarity, dedup peaks within min_gap frames apart.
  4. Pick the latest peak whose similarity is within 0.01 of the top — this
     maximizes clip length among high-quality matches rather than just sim.
  5. Fallback to window=1 if no 7-window match scores ≥ MIN_SIM; whole-clip
     fallback if even that fails.

The original CLI took a frames directory; we expose this as a library so
extract_video_frames can call it without dumping to disk twice.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


EMBED_SIZE = 32
MIN_SIM = 0.90
TOP_K = 10
DEFAULT_SKIP = 10
DEFAULT_MIN_GAP = 5


@dataclass
class LoopResult:
    loop_frame: int          # 1-indexed frame at which the cycle closes; equals total_frames if nothing found
    similarity: float        # dot-product window similarity (0-1)
    window: int              # 7, 1, or 0 (no good match)
    total_frames: int
    peaks: list[tuple[int, float]]  # (frame_index_0based, similarity), latest-first

    @property
    def found(self) -> bool:
        return self.window > 0


def _embed(path: Path) -> np.ndarray:
    img = Image.open(path).convert("RGB").resize((EMBED_SIZE, EMBED_SIZE))
    v = np.array(img, dtype=np.float32).flatten()
    return v / (np.linalg.norm(v) + 1e-8)


def _window_similarity(
    embeddings: list[np.ndarray],
    ref_start: int,
    candidate_start: int,
    window: int,
) -> float:
    total = 0.0
    for offset in range(window):
        total += float(np.dot(embeddings[ref_start + offset], embeddings[candidate_start + offset]))
    return total / window


def _dedupe(candidates: list[tuple[int, float]], min_gap: int) -> list[tuple[int, float]]:
    """Keep highest-sim representative from each cluster of nearby frames."""
    if not candidates:
        return []
    by_sim = sorted(candidates, key=lambda c: -c[1])
    kept: list[tuple[int, float]] = []
    for idx, sim in by_sim:
        if all(abs(idx - k) >= min_gap for k, _ in kept):
            kept.append((idx, sim))
    return kept


def _find_loop_in_window(
    embeddings: list[np.ndarray],
    skip: int,
    window: int,
    min_gap: int,
) -> tuple[int | None, float, list[tuple[int, float]]]:
    """Returns (idx_0based, similarity, peaks) or (None, 0.0, [])."""
    n = len(embeddings)
    first = skip + window
    last = n - window
    if first > last:
        return None, 0.0, []

    all_candidates = [
        (start, _window_similarity(embeddings, 0, start, window))
        for start in range(first, last + 1)
    ]
    top = sorted(all_candidates, key=lambda c: -c[1])[:TOP_K]
    peaks = _dedupe(top, min_gap)

    if not peaks:
        return None, 0.0, []

    top_sim = max(p[1] for p in peaks)
    latest = max(peaks, key=lambda c: c[0])
    if top_sim - latest[1] < 0.01:
        best = latest
    else:
        best = max(peaks, key=lambda c: c[1])
    return best[0], best[1], peaks


def find_loop_in_frames(
    frame_paths: list[Path],
    *,
    skip: int = DEFAULT_SKIP,
    min_gap: int = DEFAULT_MIN_GAP,
) -> LoopResult:
    """Run the two-pass strategy on a list of frame PNGs (sorted)."""
    total = len(frame_paths)
    if total < skip + 2:
        return LoopResult(
            loop_frame=total,
            similarity=0.0,
            window=0,
            total_frames=total,
            peaks=[],
        )

    embeddings = [_embed(p) for p in frame_paths]
    for window in (7, 1):
        idx, sim, peaks = _find_loop_in_window(embeddings, skip, window, min_gap)
        if idx is not None and sim >= MIN_SIM:
            return LoopResult(
                loop_frame=idx + 1,  # 1-indexed for parity with godogen output
                similarity=round(sim, 4),
                window=window,
                total_frames=total,
                peaks=sorted(peaks, key=lambda c: -c[0]),
            )

    return LoopResult(
        loop_frame=total,
        similarity=0.0,
        window=0,
        total_frames=total,
        peaks=[],
    )


def find_loop_in_video(
    video_path: Path,
    *,
    skip: int = DEFAULT_SKIP,
    min_gap: int = DEFAULT_MIN_GAP,
    crop_rect: tuple[int, int, int, int] | None = None,
) -> tuple[LoopResult, float]:
    """Decode every frame of an mp4 with ffmpeg, run loop detection, return
    (LoopResult, source_fps). Intended for use from extract_video_frames so
    we get a single ffmpeg invocation that's reused for the actual extract.

    Returns the LoopResult and the source video's frame rate (for time-window
    conversion). Frames are dumped to a temp dir that the caller is
    responsible for cleaning up — we keep them so the extract step can
    re-use them rather than re-decoding.
    """
    import shutil
    import subprocess
    import tempfile
    import json

    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise RuntimeError("ffmpeg/ffprobe not on PATH")

    # Probe source fps and dimensions
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=r_frame_rate,width,height,nb_frames,duration",
            "-of", "json", str(video_path),
        ],
        capture_output=True, text=True, check=True,
    )
    info = json.loads(probe.stdout).get("streams", [{}])[0]
    num, _, den = info.get("r_frame_rate", "24/1").partition("/")
    fps = float(num) / float(den or "1")

    tmp = Path(tempfile.mkdtemp(prefix="loopframe_"))
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(video_path)]
    if crop_rect is not None:
        x, y, w, h = crop_rect
        cmd += ["-vf", f"crop={w}:{h}:{x}:{y}"]
    cmd += [str(tmp / "frame_%05d.png")]
    subprocess.run(cmd, check=True)

    paths = sorted(tmp.glob("frame_*.png"))
    result = find_loop_in_frames(paths, skip=skip, min_gap=min_gap)
    return result, fps
