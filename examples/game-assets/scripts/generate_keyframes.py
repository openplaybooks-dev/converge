#!/usr/bin/env python3
"""
generate_keyframes.py — Generate animation keyframes using Nano-banana.

Usage:
  python scripts/generate_keyframes.py <char_id> <char_name> <state> <palette> [--frames 4]

Outputs:
  keyframes/{char_id}/{state}_{frame}.png
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from pathlib import Path

MODEL = "gemini-3.1-flash-image-preview"


def find_project_root_game_assets(start: Path | None = None) -> Path:
    """Walk up from `start` (default: cwd) until sprites.json is found."""
    cur = (start or Path.cwd()).resolve()
    while True:
        if (cur / "sprites.json").exists():
            return cur
        if cur.parent == cur:
            raise FileNotFoundError(
                f"could not locate project root (no sprites.json found "
                f"walking up from {start or Path.cwd()})"
            )
        cur = cur.parent


def call_nano_banana(prompt: str, reference_paths: list[Path], *, seed: int | None = None) -> tuple[bytes, int]:
    """Send prompt (+optional refs) to Gemini 2.5 Flash Image. Returns (png_bytes, seed)."""
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise SystemExit("google-genai SDK not installed. Run: pip install -r scripts/requirements.txt") from exc

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY not set. Export it first: export GEMINI_API_KEY=...")

    client = genai.Client(api_key=api_key)

    parts: list[object] = []
    for p in reference_paths:
        data = p.read_bytes()
        ext = p.suffix.lower()
        mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}.get(ext, "image/png")
        parts.append(types.Part.from_bytes(data=data, mime_type=mime))
    parts.append(types.Part.from_text(text=prompt))

    contents = [types.Content(role="user", parts=parts)]
    used_seed = seed if seed is not None else random.randint(1, 2_000_000_000)

    config = types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])

    for chunk in client.models.generate_content_stream(model=MODEL, contents=contents, config=config):
        if chunk.parts is None:
            continue
        for part in chunk.parts:
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                return inline.data, used_seed

    raise SystemExit(f"Gemini response contained no image. model={MODEL}, refs={len(reference_paths)}")


def build_prompt(char_name: str, state: str, palette: str, frame: int, total_frames: int, ref_path: Path | None = None) -> str:
    lines = []
    lines.append(f"You are generating an ANIMATION KEYFRAME for game character: {char_name}")
    lines.append("")
    lines.append(f"ANIMATION STATE: {state}")
    lines.append(f"FRAME: {frame + 1} of {total_frames}")

    if ref_path and ref_path.exists():
        lines.append("")
        lines.append("REFERENCE: Use the provided character reference for identity consistency.")

    lines.append("")
    lines.append("OUTPUT REQUIREMENTS:")
    lines.append(f"  - Single sprite frame (not a sprite sheet)")
    lines.append(f"  - Frame {frame + 1}/{total_frames} showing the appropriate pose for this point in the {state} animation")
    if state == "idle":
        lines.append("  - Idle pose: standing, relaxed, slight breathing motion implied")
    elif state == "walk":
        if frame == 0:
            lines.append("  - Walk cycle start: left foot forward, arms counter-swing")
        elif frame == 1:
            lines.append("  - Walk cycle mid-point: both feet together, arms passing")
        elif frame == 2:
            lines.append("  - Walk cycle mid-point: right foot forward, arms counter-swing")
        else:
            lines.append("  - Walk cycle end: both feet together, returning to start")
    lines.append("  - Pixel art style with specified palette constraints")
    lines.append("  - Resolution: 128x128 pixels")
    lines.append("  - No text, labels, or watermarks")
    lines.append("")
    lines.append(f"Art direction: {palette}")
    lines.append(f"Character: {char_name}")
    lines.append(f"Animation: {state} frame {frame + 1}")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id", help="Character ID")
    ap.add_argument("char_name", help="Character name")
    ap.add_argument("state", help="Animation state (e.g., idle, walk)")
    ap.add_argument("palette", help="Art style/palette description")
    ap.add_argument("--frames", type=int, default=4, help="Number of frames in animation (default: 4)")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root_game_assets(Path.cwd())

    # Output directory for keyframes
    out_dir = project_root / "keyframes" / args.char_id
    out_dir.mkdir(parents=True, exist_ok=True)

    # Collect reference paths
    ref_paths = []
    char_ref = project_root / "characters" / args.char_id / "ref.png"
    if char_ref.exists():
        ref_paths.append(char_ref)

    for frame in range(args.frames):
        out_path = out_dir / f"{args.state}_{frame:02d}.png"

        # Build prompt
        prompt = build_prompt(args.char_name, args.state, args.palette, frame, args.frames, ref_paths[0] if ref_paths else None)

        # Save prompt for reference
        prompt_path = out_path.with_suffix(".prompt.txt")
        prompt_path.write_text(prompt, encoding="utf-8")

        # Call API
        print(f"  Generating {args.char_name}/{args.state} frame {frame + 1}/{args.frames}...")
        try:
            img_bytes, seed_used = call_nano_banana(prompt, ref_paths, seed=args.seed)
            out_path.write_bytes(img_bytes)
            seed_path = out_path.with_suffix(".seed.txt")
            seed_path.write_text(str(seed_used), encoding="utf-8")
            print(f"    wrote {out_path.relative_to(project_root)}")
        except Exception as e:
            print(f"    ❌ Failed: {e}", file=sys.stderr)

    print(f"  ✅ Generated {args.frames} keyframes for {args.char_name}/{args.state}")
    return 0


if __name__ == "__main__":
    sys.exit(main())