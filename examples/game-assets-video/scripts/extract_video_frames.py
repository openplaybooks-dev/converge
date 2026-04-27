#!/usr/bin/env python3
"""
extract_video_frames.py — Pull N evenly-spaced frames out of the per-state video.

Reads the .mp4 at assets/characters/{char_id}/videos/{state}/{state}.mp4 and
writes N frames (default 8) into a sibling frames/ directory at the target
sprite cell size (default 384×512).

Stub-friendly: if ffprobe reports zero frames or duration (the stub backend
writes a 1KB header-only mp4), fall back to writing N transparent placeholder
PNGs at the target resolution so the pipeline progresses end-to-end.

Chroma-key: the prompt asks the video model for a pure #00FF00 background.
After extraction we run lib.image_api_gemini.ensure_transparent_background()
to produce alpha. Disable with --no-chroma-key for backends that already
emit alpha.

Usage:
  python scripts/extract_video_frames.py <char_id> <state> [--frames 8]

Outputs:
  assets/characters/{char_id}/videos/{state}/frames/{state}_000.png … {state}_007.png
"""

from __future__ import annotations

import argparse
import io
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from lib.image_api_gemini import ensure_transparent_background
from lib.sprite import find_project_root


DEFAULT_FRAMES = 24  # one second of motion at 24 fps
DEFAULT_FRAME_W = 384
DEFAULT_FRAME_H = 512


def have_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def probe_video(video_path: Path) -> dict:
    """Return { duration_s, frame_count, width, height } or empty dict on failure."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height,nb_frames,r_frame_rate,duration",
                "-show_entries", "format=duration",
                "-of", "json",
                str(video_path),
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        data = json.loads(result.stdout)
        stream = (data.get("streams") or [{}])[0]
        fmt = data.get("format") or {}
        duration = float(stream.get("duration") or fmt.get("duration") or 0.0)
        nb_frames = int(stream.get("nb_frames") or 0)
        width = int(stream.get("width") or 0)
        height = int(stream.get("height") or 0)
        return {
            "duration_s": duration,
            "frame_count": nb_frames,
            "width": width,
            "height": height,
        }
    except (subprocess.CalledProcessError, ValueError, json.JSONDecodeError):
        return {}


def detect_letterbox(video_path: Path) -> tuple[int, int, int, int] | None:
    """Sample a few frames with ffmpeg's `cropdetect` filter to learn how Veo
    (or whichever backend) framed the content inside the requested aspect.

    Veo accepts only 16:9 or 9:16 and pillar-/letter-boxes whatever it actually
    rendered into that container with PURE BLACK bars. Cropdetect reports the
    inner content rect; we hand it back so the per-frame extraction can drop
    the bars before chroma-keying.

    Returns (x, y, w, h) of the content rect, or None if cropdetect produced
    nothing usable.
    """
    proc = subprocess.run(
        [
            "ffmpeg", "-i", str(video_path),
            "-vf", "cropdetect=24:2:0",
            "-vframes", "30", "-f", "null", "-",
        ],
        capture_output=True, text=True, check=False,
    )
    # cropdetect prints lines like:
    #   [Parsed_cropdetect_0 @ ...] x1:0 x2:1279 y1:184 y2:534 w:1280 h:352 x:0 y:184 crop=1280:352:0:184
    last = None
    for line in proc.stderr.splitlines():
        if "crop=" in line:
            spec = line.split("crop=")[-1].strip()
            try:
                w, h, x, y = (int(p) for p in spec.split(":"))
                last = (x, y, w, h)
            except ValueError:
                continue
    return last


def extract_with_ffmpeg(
    video_path: Path,
    out_dir: Path,
    state: str,
    frames: int,
    duration_s: float,
    crop_rect: tuple[int, int, int, int] | None = None,
    window_start: float = 0.0,
    window_end: float | None = None,
) -> list[Path]:
    """Extract `frames` PNGs at evenly-spaced timestamps within
    [window_start, window_end] seconds of the source video. If window_end is
    None it defaults to duration_s (sample across the whole clip).

    Veo's minimum render is 4s but we often only want a 1s slice's worth of
    motion for a sprite cycle — pass window_end=1.0 to sample 8 frames from
    the first second only.

    Crops the inner content rect first if `crop_rect` is given (drops Veo's
    letterbox bars). Per-frame chroma-key + tight-crop happens in main().
    """
    paths: list[Path] = []
    vf = None
    if crop_rect is not None:
        x, y, w, h = crop_rect
        vf = f"crop={w}:{h}:{x}:{y}"
    end = duration_s if window_end is None else min(window_end, duration_s)
    span = max(0.001, end - window_start)
    for i in range(frames):
        # Sample at the MIDDLE of each segment within the chosen window.
        t = window_start + (i + 0.5) * span / frames
        out = out_dir / f"{state}_{i:03d}.png"
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-ss", f"{t:.3f}",
            "-i", str(video_path),
            "-vframes", "1",
        ]
        if vf:
            cmd += ["-vf", vf]
        cmd += [str(out)]
        subprocess.run(cmd, check=True)
        paths.append(out)
    return paths


def write_placeholder_frames(
    out_dir: Path,
    state: str,
    frames: int,
    width: int,
    height: int,
) -> list[Path]:
    """Write N transparent PNGs — used when the video has no real content (stub)."""
    paths: list[Path] = []
    blank = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for i in range(frames):
        out = out_dir / f"{state}_{i:03d}.png"
        blank.save(out, format="PNG")
        paths.append(out)
    return paths


def chroma_key_in_place(path: Path) -> None:
    img_bytes = path.read_bytes()
    # The PIL image may be fully transparent already (placeholder). Skip in
    # that case to avoid spending cycles on a no-op.
    img = Image.open(io.BytesIO(img_bytes))
    if img.mode == "RGBA":
        alpha = img.split()[-1]
        if alpha.getextrema() == (0, 0):
            return
    out_bytes = ensure_transparent_background(img_bytes)
    path.write_bytes(out_bytes)


def _frame_alpha_bbox(path: Path, alpha_threshold: int = 16) -> tuple[int, int, int, int] | None:
    img = Image.open(path).convert("RGBA")
    alpha = img.split()[-1]
    return alpha.point(lambda v: 255 if v > alpha_threshold else 0).getbbox()


def compute_global_bbox(
    paths: list[Path],
    *,
    padding_pct: float = 0.06,
    alpha_threshold: int = 16,
) -> tuple[tuple[int, int, int, int], int] | None:
    """Union the character bbox across every frame.

    Returns ((x0, y0, x1, y1), char_bottom_in_crop) where:
      - (x0, y0, x1, y1) is the padded crop rect to apply uniformly to all
        frames (keeps character size + position stable WITHIN a state)
      - char_bottom_in_crop is the Y position of the un-padded character
        bottom edge, expressed in CROP-LOCAL coordinates (i.e. distance
        from y0 of the padded rect). Used by apply_global_crop to anchor
        feet at a consistent ground line.

    Returns None if every frame is empty.
    """
    if not paths:
        return None
    sample = Image.open(paths[0])
    src_w, src_h = sample.size

    union: tuple[int, int, int, int] | None = None
    for p in paths:
        bbox = _frame_alpha_bbox(p, alpha_threshold=alpha_threshold)
        if bbox is None:
            continue
        if union is None:
            union = bbox
        else:
            union = (
                min(union[0], bbox[0]),
                min(union[1], bbox[1]),
                max(union[2], bbox[2]),
                max(union[3], bbox[3]),
            )

    if union is None:
        return None

    x0, y0, x1, y1 = union
    bbox_w = x1 - x0
    bbox_h = y1 - y0
    pad_x = int(bbox_w * padding_pct)
    pad_y = int(bbox_h * padding_pct)
    padded_x0 = max(0, x0 - pad_x)
    padded_y0 = max(0, y0 - pad_y)
    padded_x1 = min(src_w, x1 + pad_x)
    padded_y1 = min(src_h, y1 + pad_y)
    # Character bottom (un-padded) in crop-local coords. y1 is the absolute
    # source-image Y of the un-padded character bottom; subtracting padded_y0
    # gives the offset inside the cropped region.
    char_bottom_in_crop = y1 - padded_y0
    return (
        (padded_x0, padded_y0, padded_x1, padded_y1),
        char_bottom_in_crop,
    )


def apply_global_crop(
    path: Path,
    crop_rect: tuple[int, int, int, int],
    target_w: int,
    target_h: int,
    *,
    target_char_h_px: int | None = None,
    char_bottom_in_crop: int | None = None,
    ground_y_px: int | None = None,
) -> None:
    """Crop the frame to the shared rect, place into the target cell with
    the character's feet anchored to a fixed ground line.

    Args:
      target_char_h_px: scale so the unpadded character bbox is exactly this
        tall in the output. Locks size across states.
      char_bottom_in_crop: Y position of the un-padded character bottom
        within the cropped region (returned by compute_global_bbox).
      ground_y_px: cell-local Y that the character's bottom should land on.
        If None, defaults to target_h - 16. Pass the same value across all
        states for cross-state foot alignment.

    With both `char_bottom_in_crop` and `ground_y_px` set: the character's
    feet land at exactly the same cell-Y in every frame (within state) and
    every state.
    """
    img = Image.open(path).convert("RGBA")
    cropped = img.crop(crop_rect)
    crop_w, crop_h = cropped.size

    if target_char_h_px is not None and target_char_h_px > 0:
        scale = target_char_h_px / crop_h
        if crop_w * scale > target_w:
            scale = target_w / crop_w
    else:
        scale = min(target_w / crop_w, target_h / crop_h)

    new_w = max(1, int(crop_w * scale))
    new_h = max(1, int(crop_h * scale))
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    paste_x = (target_w - new_w) // 2

    if char_bottom_in_crop is not None and ground_y_px is not None:
        # Character feet land at ground_y_px. Compute paste_y so the resized
        # character's feet (at char_bottom_in_crop * scale within the resized
        # image) hit ground_y_px.
        feet_in_resized = int(round(char_bottom_in_crop * scale))
        paste_y = ground_y_px - feet_in_resized
    else:
        # Fallback: bottom-anchor the entire crop with a small margin
        paste_y = target_h - new_h - 16

    # Clamp so we never paste outside the cell on top
    if paste_y < 0:
        paste_y = 0
    canvas.paste(resized, (paste_x, paste_y), resized)
    canvas.save(path, format="PNG")


def measure_canonical_baseline(
    canonical_path: Path,
    target_h: int,
    *,
    alpha_threshold: int = 16,
    padding_pct: float = 0.06,
) -> int:
    """Measure how tall the character should be in the output cell, based on
    the canonical reference.

    Reads canonical.png, finds the character bbox (alpha > threshold OR
    chroma-keyed if the canonical is on green), pads it the same 6% as the
    per-frame global bbox, and computes the proportional target height in
    output pixels. That value is then passed to apply_global_crop so every
    state's character ends up the same size.

    Returns target character height in output cell pixels. Falls back to
    target_h * 0.92 if the canonical can't be read (preserves a sane scale).
    """
    if not canonical_path.exists():
        return int(target_h * 0.92)

    img = Image.open(canonical_path).convert("RGBA")
    arr_alpha = img.split()[-1]
    bbox = arr_alpha.point(lambda v: 255 if v > alpha_threshold else 0).getbbox()

    # If alpha is fully opaque (e.g. canonical is on a solid green bg, no
    # transparency yet), the alpha-bbox covers the whole image and tells us
    # nothing. Fall through to chroma-key detection in that case.
    full_image_alpha = (
        bbox is not None
        and bbox[0] == 0 and bbox[1] == 0
        and bbox[2] == img.width and bbox[3] == img.height
    )

    if bbox is None or full_image_alpha:
        # Try chroma-key against corner sample
        import numpy as np
        rgb = np.array(img.convert("RGB"), dtype=np.int16)
        # Average top-left + top-right corners
        corner = np.concatenate([rgb[:8, :8].reshape(-1, 3), rgb[:8, -8:].reshape(-1, 3)])
        bg = corner.mean(axis=0)
        diff = rgb - bg[None, None, :]
        # Fg pixels are those NOT close to bg (any channel diff > 30)
        fg_mask = (np.abs(diff) > 30).any(axis=2)
        ys, xs = np.where(fg_mask)
        if len(xs) == 0:
            return int(target_h * 0.92)
        bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)

    canonical_full_h = img.height
    char_h = bbox[3] - bbox[1]
    # Apply same padding the per-frame bbox uses
    char_h_padded = char_h + int(char_h * padding_pct * 2)
    # Proportional target height
    return int(round(target_h * (char_h_padded / canonical_full_h)))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id")
    ap.add_argument("state")
    ap.add_argument("--frames", type=int, default=DEFAULT_FRAMES)
    ap.add_argument("--width", type=int, default=DEFAULT_FRAME_W)
    ap.add_argument("--height", type=int, default=DEFAULT_FRAME_H)
    ap.add_argument(
        "--no-chroma-key",
        action="store_true",
        help="Skip background removal (use for backends that emit alpha natively).",
    )
    ap.add_argument(
        "--bg-color", default=None,
        help="Background color override as #RRGGBB hex. If unset, sampled from the first frame's corners.",
    )
    ap.add_argument(
        "--matting-regime",
        choices=["auto", "trust", "adapt", "color"],
        default="auto",
        help="Matting regime. 'auto' picks based on BiRefNet mask coverage; 'color' is mask-free fallback.",
    )
    ap.add_argument(
        "--preview", action="store_true",
        help="Write `<frame>_qa.png` previews on contrasting bg so alpha can be visually verified.",
    )
    ap.add_argument(
        "--window-start", type=float, default=0.0,
        help="Earliest sample time in seconds (default 0.0).",
    )
    ap.add_argument(
        "--window-end", type=float, default=None,
        help="Latest sample time in seconds. If unset and --auto-loop is on (default), "
             "the loop-frame detector picks this. Pass an explicit value to disable detection.",
    )
    ap.add_argument(
        "--auto-loop", dest="auto_loop", action="store_true", default=True,
        help="Use lib.loop_frame to auto-pick the cycle's end (default on).",
    )
    ap.add_argument(
        "--no-auto-loop", dest="auto_loop", action="store_false",
        help="Disable loop detection; fall back to fixed --window-end (or 1.0 if unset).",
    )
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    video_dir = project_root / "assets" / "characters" / args.char_id / "videos" / args.state
    video_path = video_dir / f"{args.state}.mp4"
    out_dir = video_dir / "frames"
    out_dir.mkdir(parents=True, exist_ok=True)

    if not video_path.exists():
        raise SystemExit(
            f"Video not found: {video_path}\n"
            f"Run first: python scripts/generate_video_clip.py {args.char_id} {args.state}"
        )

    use_placeholder = False

    if not have_ffmpeg():
        sys.stderr.write(
            "  ⚠ ffmpeg/ffprobe not found on PATH — writing transparent placeholder frames "
            "so the pipeline can complete. Install ffmpeg for real extraction.\n"
        )
        use_placeholder = True
    else:
        info = probe_video(video_path)
        duration = info.get("duration_s", 0.0)
        if duration <= 0.05:
            sys.stderr.write(
                f"  ⚠ video has no usable duration ({duration}s) — likely the stub backend. "
                "Writing transparent placeholder frames.\n"
            )
            use_placeholder = True

    if use_placeholder:
        paths = write_placeholder_frames(out_dir, args.state, args.frames, args.width, args.height)
    else:
        info = probe_video(video_path)
        # Drop Veo's letterbox bars before extraction. Cropdetect runs once
        # per video, not per frame, so the cost is negligible.
        crop_rect = detect_letterbox(video_path)
        if crop_rect:
            x, y, w, h = crop_rect
            sys.stderr.write(
                f"  cropdetect: inner content rect {w}x{h} at ({x},{y}) — "
                f"dropping {info.get('width', 0) - w}px horizontal + "
                f"{info.get('height', 0) - h}px vertical of bars\n"
            )

        # Resolve window_end: explicit value wins; else auto-loop; else fall back to 1.0s.
        window_end = args.window_end
        if window_end is None and args.auto_loop:
            try:
                from lib.loop_frame import find_loop_in_video
                loop_result, fps = find_loop_in_video(video_path, crop_rect=crop_rect)
                if loop_result.found and fps > 0:
                    window_end = loop_result.loop_frame / fps
                    sys.stderr.write(
                        f"  auto-loop: best loop at frame {loop_result.loop_frame}/"
                        f"{loop_result.total_frames} (sim={loop_result.similarity:.3f}, "
                        f"window={loop_result.window}) → window_end={window_end:.3f}s\n"
                    )
                else:
                    sys.stderr.write(
                        "  auto-loop: no good loop point found, falling back to 1.0s window\n"
                    )
                    window_end = 1.0
            except Exception as e:
                sys.stderr.write(f"  auto-loop failed: {e}; falling back to 1.0s window\n")
                window_end = 1.0
        elif window_end is None:
            window_end = 1.0

        paths = extract_with_ffmpeg(
            video_path,
            out_dir,
            args.state,
            args.frames,
            info["duration_s"],
            crop_rect=crop_rect,
            window_start=args.window_start,
            window_end=window_end,
        )
        if not args.no_chroma_key:
            from lib import matting

            # Background color: explicit override > sampled from frame 0 corners.
            # Sampling once and reusing across all 24 frames keeps the matte
            # consistent even if Veo's bg color drifts mid-clip.
            if args.bg_color:
                hex_color = args.bg_color.lstrip("#")
                bg_color = np.array([
                    int(hex_color[0:2], 16) / 255.0,
                    int(hex_color[2:4], 16) / 255.0,
                    int(hex_color[4:6], 16) / 255.0,
                ], dtype=np.float64)
            else:
                first = np.array(Image.open(paths[0]).convert("RGB"), dtype=np.float64) / 255.0
                bg_color = matting.sample_bg_color(first)
            sys.stderr.write(
                f"  matting bg color: RGB({bg_color[0]*255:.0f},{bg_color[1]*255:.0f},{bg_color[2]*255:.0f})\n"
            )

            session = matting.get_session("birefnet-general")
            mode = "hybrid (BiRefNet + color)" if session is not None else "color-only"
            sys.stderr.write(f"  matting mode: {mode}, regime={args.matting_regime}\n")

            for p in paths:
                matting.matte_in_place(
                    p,
                    bg_color=bg_color,
                    regime=args.matting_regime,
                    session=session,
                    preview=args.preview,
                )
        # Two-pass crop: measure the character's bbox UNION across all frames,
        # then apply that single crop rect uniformly. Keeps character size +
        # position stable WITHIN the cycle.
        bbox_result = compute_global_bbox(paths)
        if bbox_result is not None:
            global_bbox, char_bottom_in_crop = bbox_result
            sys.stderr.write(
                f"  global bbox: {global_bbox} (w={global_bbox[2]-global_bbox[0]} "
                f"h={global_bbox[3]-global_bbox[1]}, char_bottom_in_crop={char_bottom_in_crop}) "
                f"— applied uniformly to all frames\n"
            )

            # Cross-state size + ground-line lock: read the canonical
            # reference once and derive both target character height AND a
            # fixed cell-Y for the character's feet. Every state lands its
            # feet at the same Y; sizes match. Idle / walk / attack all
            # appear to stand on the same ground line.
            canonical_path = (
                project_root
                / "assets" / "characters" / args.char_id
                / "ref" / "canonical" / "canonical.png"
            )
            target_char_h = measure_canonical_baseline(canonical_path, args.height)
            # Feet anchor at 95% of cell height. Makes the character "stand"
            # near the bottom with a small margin (avoid clipping at the
            # very bottom edge in engine renderers).
            ground_y = int(args.height * 0.95)
            sys.stderr.write(
                f"  canonical baseline: target character height = {target_char_h}px, "
                f"ground line = y={ground_y}px (target cell {args.width}×{args.height})\n"
            )

            for p in paths:
                apply_global_crop(
                    p, global_bbox, args.width, args.height,
                    target_char_h_px=target_char_h,
                    char_bottom_in_crop=char_bottom_in_crop,
                    ground_y_px=ground_y,
                )
        else:
            sys.stderr.write("  ⚠ all frames empty after chroma-key — skipping crop\n")

    print(
        f"[{args.char_id}] extracted {len(paths)} frame(s) to "
        f"{out_dir.relative_to(project_root)} "
        f"(placeholder={use_placeholder})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
