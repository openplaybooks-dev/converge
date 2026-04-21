#!/usr/bin/env python3
"""
compose_blend.py — call Nano-banana (Gemini 2.5 Flash Image) to blend a
composition's elements into one photoreal keyframe.

Inputs to the blender (in order, so the model uses the blueprint as layout
anchor and each element as identity reference):

  1. the preview blueprint PNG (emitted by compose_preview.py — MUST exist)
  2. the base location plate
  3. one image per element (in z_order)

Prompt: composition.blend_prompt + standard scaffold describing the role of
each reference image.

Output:
  keyframes/{shot_id}/{start|end}.png
  keyframes/{shot_id}/{start|end}.seed.txt
  keyframes/{shot_id}/{start|end}.prompt.txt    (what was actually sent)

Usage:
  python scripts/compose_blend.py <composition.json> [--dry-run]

  --dry-run   print the assembled prompt and reference list, skip the API call
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib.composition import Composition, find_project_root  # noqa: E402


MODEL = "gemini-2.5-flash-image"
LOG_REL = ".converge/logs/image-generate.log"


# ---------------------------------------------------------------------------
# Prompt assembly


def _element_line(i: int, el) -> str:
    bits = [f"Element #{i} ({el.type}): id='{el.id}'"]
    if el.pose_hint:
        bits.append(f"pose: {el.pose_hint}")
    bits.append(f"position: x={el.x:.2f}, y={el.y:.2f}, w={el.width:.2f}, h={el.height:.2f}")
    if el.rotation_deg:
        bits.append(f"rotation: {el.rotation_deg:g}°")
    if el.flip_horizontal:
        bits.append("flipped horizontally")
    if el.notes:
        bits.append(f"note: {el.notes}")
    return " | ".join(bits)


def build_prompt(comp: Composition) -> str:
    lines: list[str] = []

    lines.append(
        "You are blending a cinematic frame. Reference images are provided in this order:"
    )
    lines.append("  1. BLUEPRINT — a flat composite showing WHERE each element goes. Use this as the layout anchor.")
    lines.append("  2. BASE — the location plate. This is the environment/background.")
    for i, el in enumerate(comp.elements, start=3):
        lines.append(
            f"  {i}. ELEMENT REF for '{el.id}' ({el.type}) — preserve this element's identity/appearance."
        )

    lines.append("")
    lines.append(
        "Produce one photoreal cinematic frame that matches the blueprint's layout exactly, "
        "with each element rendered at its blueprint position and sized per the blueprint, "
        "while preserving the identity/appearance shown in each element reference."
    )

    lines.append("")
    lines.append("ELEMENT DETAILS (normalized 0-1 coords, top-left anchor):")
    for i, el in enumerate(comp.elements, start=1):
        lines.append(f"  - {_element_line(i, el)}")

    if comp.lighting:
        lines.append("")
        lines.append("LIGHTING:")
        for k, v in comp.lighting.items():
            if v:
                lines.append(f"  - {k}: {v}")

    if comp.motion_intent and comp.frame == "end":
        lines.append("")
        lines.append("MOTION INTENT (this is the END frame; the start frame was rendered separately):")
        if comp.motion_intent.get("summary"):
            lines.append(f"  - summary: {comp.motion_intent['summary']}")
        if comp.motion_intent.get("elements_that_move"):
            lines.append(f"  - elements that moved: {', '.join(comp.motion_intent['elements_that_move'])}")
        if comp.motion_intent.get("camera_move"):
            lines.append(f"  - camera move: {comp.motion_intent['camera_move']}")

    lines.append("")
    lines.append("DIRECTION:")
    lines.append(comp.blend_prompt.strip() or "(no extra direction)")

    neg = comp.negative_prompt or "no on-screen text, no subtitles, no watermarks, no duplicate characters, no camera crew visible"
    lines.append("")
    lines.append(f"NEGATIVE: {neg}")

    lines.append("")
    lines.append(
        f"Output resolution: {comp.canvas_w}x{comp.canvas_h}. "
        f"Aspect ratio: {comp.aspect_ratio or 'as per resolution'}. "
        "Output a single image; do not include text overlays."
    )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# API call


def _load_image_bytes(path: Path) -> tuple[bytes, str]:
    data = path.read_bytes()
    ext = path.suffix.lower()
    mime = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }.get(ext, "image/png")
    return data, mime


def call_nano_banana(
    prompt: str,
    reference_paths: list[Path],
    *,
    seed: int | None,
) -> tuple[bytes, int]:
    """
    Send (refs + prompt) to Gemini 2.5 Flash Image. Returns (png_bytes, seed_used).
    """
    try:
        from google import genai  # type: ignore
        from google.genai import types  # type: ignore
    except ImportError as exc:
        raise SystemExit(
            "google-genai SDK not installed. Run: pip install -r scripts/requirements.txt"
        ) from exc

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit(
            "GEMINI_API_KEY not set in environment. "
            "Obtain one at https://aistudio.google.com/apikey and export it."
        )

    client = genai.Client(api_key=api_key)

    parts: list[object] = []
    for p in reference_paths:
        data, mime = _load_image_bytes(p)
        parts.append(types.Part.from_bytes(data=data, mime_type=mime))
    parts.append(prompt)

    used_seed = seed if seed is not None else random.randint(1, 2_000_000_000)

    response = client.models.generate_content(
        model=MODEL,
        contents=parts,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            seed=used_seed,
        ),
    )

    # extract the first image
    for cand in response.candidates or []:
        for part in cand.content.parts or []:
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                return inline.data, used_seed

    raise SystemExit(
        "Gemini response contained no image. "
        f"response.candidates[0].finish_reason={getattr(response.candidates[0], 'finish_reason', '?')}"
    )


# ---------------------------------------------------------------------------
# Logging


def log_call(project_root: Path, entry: dict) -> None:
    log_path = project_root / LOG_REL
    log_path.parent.mkdir(parents=True, exist_ok=True)
    entry = {"ts": datetime.now(timezone.utc).isoformat(), **entry}
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry) + "\n")


# ---------------------------------------------------------------------------
# CLI


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("composition", type=Path)
    ap.add_argument("--dry-run", action="store_true",
                    help="print assembled prompt + reference list, skip API call")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(args.composition.parent)
    comp = Composition.load(args.composition, project_root)

    # -- assemble references (blueprint first, then base, then elements) --

    preview_path = args.composition.with_suffix(".preview.png")
    if not preview_path.exists():
        raise SystemExit(
            f"blueprint preview missing: {preview_path}. "
            "Run compose_preview.py first."
        )

    references: list[Path] = [preview_path, comp.base_ref]
    for el in comp.elements:
        if el.ref.exists():
            references.append(el.ref)
        else:
            print(f"  ! element '{el.id}' ref missing, skipping: {el.ref_rel}", file=sys.stderr)

    prompt = build_prompt(comp)

    # -- output paths --

    out_dir = project_root / "keyframes" / comp.shot_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_png = out_dir / f"{comp.frame}.png"
    out_seed = out_dir / f"{comp.frame}.seed.txt"
    out_prompt = out_dir / f"{comp.frame}.prompt.txt"

    out_prompt.write_text(prompt, encoding="utf-8")

    if args.dry_run:
        print("=" * 60)
        print("REFERENCES (in order):")
        for i, r in enumerate(references, 1):
            print(f"  {i}. {r.relative_to(project_root) if r.is_relative_to(project_root) else r}")
        print("=" * 60)
        print("PROMPT:")
        print(prompt)
        print("=" * 60)
        print(f"(would write to {out_png.relative_to(project_root)})")
        return 0

    # -- call --

    img_bytes, seed_used = call_nano_banana(prompt, references, seed=args.seed)

    out_png.write_bytes(img_bytes)
    out_seed.write_text(str(seed_used), encoding="utf-8")

    log_call(project_root, {
        "op": "compose_blend",
        "shot_id": comp.shot_id,
        "frame": comp.frame,
        "model": MODEL,
        "seed": seed_used,
        "refs": [str(r.relative_to(project_root)) if r.is_relative_to(project_root) else str(r) for r in references],
        "output": str(out_png.relative_to(project_root)),
        "ok": True,
    })

    print(f"wrote {out_png.relative_to(project_root)}  seed={seed_used}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
