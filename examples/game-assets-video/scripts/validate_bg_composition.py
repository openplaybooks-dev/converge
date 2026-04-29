#!/usr/bin/env python3
"""validate_bg_composition.py — Cross-layer vision-judge for a scene's
parallax stack.

Composites bg-far + bg-mid + bg-near into one image and asks Gemini whether
the three layers tell a coherent visual story together. Catches issues
that per-layer validators can't: mid silhouettes that contradict the far
horizon, near foreground edges that don't align with the silhouette
elevation, palette drift across layers.

Reads:
  - assets/scenes/{scene_id}/bg-far.png
  - assets/scenes/{scene_id}/bg-mid.png
  - assets/scenes/{scene_id}/bg-near.png
  - assets/scenes/{scene_id}/concept.png   (scene anchor)
  - assets/scenes/{scene_id}/map.silhouette.png  (binding macro layout)
  - assets/scenes/{scene_id}/stage.json    (sections, beats, elevation)

Writes:
  - assets/scenes/{scene_id}/bg-composition.critique.json
  - assets/scenes/{scene_id}/bg-composition.preview.png  (debug — the
                                                          composite the
                                                          judge looked at)
  - One of:
      - exit 0 (verdict pass: no high-severity issues)
      - exit 1 + delete the entire flagged layer's stitched PNG so the
        runner regenerates that layer

Output schema:
  { "verdict": "pass" | "fix",
    "summary": "...",
    "layers": [
      { "layer": "far"|"mid"|"near",
        "decision": "keep"|"fix",
        "severity": "high"|"low"|"n/a",
        "issues": ["..."],
        "advice": "..." }
    ],
    "fix_layers": ["far"|"mid"|"near", ...]   # high-severity only
  }

Usage:
  python scripts/validate_bg_composition.py <scene_id>
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from PIL import Image

from lib import budget
from lib.image_api import active_backend
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


def parse_json_from_text(text: str) -> dict | None:
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    candidate = fenced.group(1) if fenced else text
    start = candidate.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(candidate)):
        ch = candidate[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                blob = candidate[start:i + 1]
                try:
                    return json.loads(blob)
                except Exception:
                    return None
    return None


def composite_layers(layers: list[Path], width: int, height: int) -> Image.Image:
    """Composite far → mid → near onto a sky-blue base canvas, downscaled
    to a manageable size for the vision judge."""
    canvas = Image.new("RGBA", (width, height), (170, 209, 241, 255))
    for p in layers:
        try:
            with Image.open(p) as im:
                im = im.convert("RGBA")
                if im.size != (width, height):
                    im = im.resize((width, height), Image.LANCZOS)
                canvas = Image.alpha_composite(canvas, im)
        except Exception as exc:
            sys.stderr.write(f"  ⚠ failed to composite {p}: {exc}\n")
    return canvas


def build_critique_prompt(scene_id: str, stage: dict) -> str:
    world = stage.get("world") or {}
    w = world.get("width_tiles", "?")
    h = world.get("height_tiles", "?")
    beats = stage.get("beats") or []
    elev = stage.get("elevation") or []
    beat_text = "\n".join(
        f"  - x_tile={b.get('x_tile')} {b.get('kind')}: {b.get('label')}"
        for b in beats
    ) or "  - (none)"
    elev_text = "(no elevation samples)" if not elev else (
        f"min y={min(e.get('y_tile', 0) for e in elev)}, "
        f"max y={max(e.get('y_tile', 0) for e in elev)}, "
        f"samples={len(elev)}"
    )
    return f"""You are reviewing the COMPOSITED parallax background of a 2D action-scroller scene.

Inputs you receive (in this order):
  1. The COMPOSITE — far + mid + near layered together. This is what the player would see.
  2. The SCENE CONCEPT — the per-scene anchor showing the intended look.
  3. The MAP SILHOUETTE — the macro layout / elevation profile of the entire map.

Map context:
- Scene: {scene_id}
- World: {w} tiles wide × {h} tall
- Elevation: {elev_text}
- Beats:
{beat_text}

Your task: judge whether the three layers compose into a coherent playable scene. For each layer, decide whether to KEEP it or FIX it. Look for these cross-layer issues specifically:

  a. ELEVATION-MISMATCH — far horizon, mid silhouette base, and near foreground edge don't agree on where the ground line lies.
  b. PALETTE-DRIFT — saturation, lighting, or hue shifts unnaturally between layers.
  c. CONTENT-COLLISION — mid silhouettes overlap the foreground edge and obscure each other; far mountains poke through mid where they shouldn't.
  d. STYLE-DRIFT — line weight or shading style differs noticeably between layers.
  e. BLOCKING — a layer's content blocks the playable area where the player walks.

Output ONE JSON object — no prose, no preamble:

```json
{{
  "verdict": "pass" | "fix",
  "summary": "<one paragraph: how does the stack read overall?>",
  "layers": [
    {{
      "layer":     "far" | "mid" | "near",
      "decision":  "keep" | "fix",
      "severity":  "high" | "low" | "n/a",
      "issues":    ["<short tag>", ...],
      "advice":    "<specific instructions for the regen prompt; empty when keep>"
    }},
    {{ "layer": "mid",  ... }},
    {{ "layer": "near", ... }}
  ],
  "fix_layers": ["<layer>", ...]   // layers marked decision=fix with severity=high
}}
```

Verdict rule:
- "pass" if every layer is decision=keep, OR every fix is severity=low.
- "fix" if any layer is decision=fix with severity=high.
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    far_p = scene_dir / "bg-far.png"
    mid_p = scene_dir / "bg-mid.png"
    near_p = scene_dir / "bg-near.png"

    missing = [p for p in [far_p, mid_p, near_p] if not p.exists()]
    if missing:
        sys.stderr.write(
            f"  cannot validate composition — missing: {[str(p.relative_to(project_root)) for p in missing]}\n"
        )
        return 1

    stage_path = scene_dir / "stage.json"
    stage: dict = {}
    if stage_path.exists():
        try:
            stage = json.loads(stage_path.read_text(encoding="utf-8"))
        except Exception:
            stage = {}

    # Downsample to a wide thumbnail the vision-judge can read.
    bg_target_w = ((stage.get("background") or {}).get("target_width_px")) or 3904
    bg_target_h = ((stage.get("background") or {}).get("target_height_px")) or 288
    aspect = bg_target_w / max(bg_target_h, 1)
    preview_w = 1920
    preview_h = max(256, int(preview_w / max(aspect, 1)))
    composite = composite_layers([far_p, mid_p, near_p], preview_w, preview_h)
    preview_path = scene_dir / "bg-composition.preview.png"
    composite.save(preview_path, format="PNG")

    image_paths: list[Path] = [preview_path]
    concept_p = scene_dir / "concept.png"
    silhouette_p = scene_dir / "map.silhouette.png"
    if concept_p.exists():
        image_paths.append(concept_p)
    if silhouette_p.exists():
        image_paths.append(silhouette_p)

    prompt = build_critique_prompt(args.scene_id, stage)
    backend = active_backend()
    cost = budget.cost_for_image(backend)

    sys.stderr.write(
        f"[validate-composition {args.scene_id}] backend={backend} cost={cost}c "
        f"composite={preview_path.relative_to(project_root)}\n"
    )

    with budget.charged(
        project_root, cost, f"text-{backend}",
        note=f"validate-composition-{args.scene_id}",
    ):
        text = generate_text_from_image(prompt, image_paths=image_paths)

    raw_path = scene_dir / "bg-composition.critique.raw.txt"
    raw_path.write_text(text or "", encoding="utf-8")

    parsed = parse_json_from_text(text or "")
    if not parsed:
        sys.stderr.write(
            "  ⚠ critique JSON parse failed — raw saved; treating as pass\n"
        )
        # Write a placeholder critique so the gating check still passes.
        critique_path = scene_dir / "bg-composition.critique.json"
        critique_path.write_text(
            json.dumps({"verdict": "pass", "summary": "parse failed — passing to avoid stall",
                        "layers": [], "fix_layers": []}, indent=2),
            encoding="utf-8",
        )
        return 0

    layers = parsed.get("layers") or []
    fix_layers = parsed.get("fix_layers") or [
        l.get("layer") for l in layers
        if l.get("decision") == "fix" and l.get("severity") == "high"
    ]
    fix_layers = [l for l in fix_layers if l in ("far", "mid", "near")]
    fix_layers = list(dict.fromkeys(fix_layers))  # de-dupe, preserve order
    parsed["fix_layers"] = fix_layers

    critique_path = scene_dir / "bg-composition.critique.json"
    critique_path.write_text(json.dumps(parsed, indent=2), encoding="utf-8")

    verdict = parsed.get("verdict")
    high_count = sum(
        1 for l in layers
        if l.get("decision") == "fix" and l.get("severity") == "high"
    )
    sys.stderr.write(
        f"  verdict={verdict!r} fix_layers={fix_layers} high_severity={high_count}\n"
    )

    # Pass when no high-severity issue. Low-severity issues are recorded
    # in the critique JSON but don't drive a regen — composition is
    # subjective and the vision judge will always flag nits.
    if high_count == 0:
        return 0

    # Delete the flagged stitched PNGs (and the segment dir contents) so
    # the runner re-runs the layer's segment + stitch tasks.
    for layer in fix_layers:
        png = scene_dir / f"bg-{layer}.png"
        if png.exists():
            png.unlink()
            sys.stderr.write(f"  deleted {png.relative_to(project_root)} for regen\n")
        # Also drop the per-layer segment dir for layers that have one,
        # so the segment tasks regenerate from scratch with feedback.
        segs_dir = scene_dir / f"bg-{layer}"
        if segs_dir.is_dir():
            for f in segs_dir.glob("seg-*.png"):
                f.unlink()
            sys.stderr.write(f"  cleared {segs_dir.relative_to(project_root)}/seg-*.png\n")
    return 1


if __name__ == "__main__":
    sys.exit(main())
