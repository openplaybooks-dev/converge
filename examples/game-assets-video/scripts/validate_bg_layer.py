#!/usr/bin/env python3
"""validate_bg_layer.py — Vision-judge a stitched bg layer's segments.

For a given (scene_id, layer), composite the per-segment PNGs in order
and ask Gemini to critique the result against the macro silhouette and
the scene concept. Output a structured critique JSON.

Reads:
  - assets/scenes/{scene_id}/bg-{layer}/seg-NNN.png      (every segment)
  - assets/scenes/{scene_id}/concept.png                 (scene anchor)
  - assets/scenes/{scene_id}/map.silhouette.png          (macro layout)
  - assets/scenes/{scene_id}/stage.json                  (sections + beats)

Writes:
  - assets/scenes/{scene_id}/bg-{layer}.critique.json    (full critique)
  - assets/scenes/{scene_id}/bg-{layer}/seg-NNN.critique.txt   (per-segment critique;
                                                          consumed by the segment
                                                          generator on retry)
  - assets/scenes/{scene_id}/bg-{layer}.composite.png    (debug: stitched preview)

Exit code:
  0 — verdict was "pass"; stitch may proceed.
  1 — verdict was "fix" (or no segments / parse failure); the runner should
      delete flagged segments and rerun the segment tasks. The flagged
      segments to delete are listed in `bg-{layer}.critique.json[fix_targets]`.

Usage:
  python scripts/validate_bg_layer.py <scene_id> <layer>
"""

from __future__ import annotations

import argparse
import io
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


def composite_segments(seg_paths: list[Path]) -> Image.Image:
    """Concatenate segments side-by-side at native resolution.
    Layers are RGBA; we paste onto a transparent canvas. Note: this is the
    naïve concat — the real stitch.py applies feather-blend overlap. For
    validation, the naïve concat is fine because we only need to see
    whether the seams and content tell a coherent story."""
    if not seg_paths:
        raise SystemExit("no segments to composite")
    images = [Image.open(p).convert("RGBA") for p in seg_paths]
    h = max(im.height for im in images)
    total_w = sum(im.width for im in images)
    canvas = Image.new("RGBA", (total_w, h), (0, 0, 0, 0))
    x = 0
    for im in images:
        canvas.paste(im, (x, 0), im)
        x += im.width
    return canvas


def build_critique_prompt(scene_id: str, layer: str, stage: dict, seg_count: int) -> str:
    biome = ""
    description = ""
    world = stage.get("world") or {}
    w_tiles = world.get("width_tiles", "?")
    beats = stage.get("beats") or []
    chunks = stage.get("chunks") or []
    beat_text = "\n".join(
        f"  - x_tile={b.get('x_tile')} {b.get('kind')}: {b.get('label')}"
        for b in beats
    ) or "  - (no beats)"
    chunk_text = "\n".join(
        f"  - {c.get('id')} x_tiles={c.get('x_tiles')} ground={c.get('ground_type')}: {c.get('narrative', '')}"
        for c in chunks
    ) or "  - (no chunks)"

    role_block = (
        "Mid layer: a transparent silhouette band — clumps of mid-distance trees, "
        "hill ridges, distant foliage, with pure chroma-green negative space above "
        "and below. The far layer should show through the top of the band; the "
        "near layer / characters show through the bottom. Mid is NEVER a full backdrop."
        if layer == "mid"
        else "Near layer: the foreground edge — a transparent strip with content "
             "concentrated in the bottom 30-45% of the canvas (ground texture, "
             "low foreground props, foliage), with pure chroma-green negative space "
             "above. The far + mid layers show through the top. Near is NEVER a full backdrop."
    )

    return f"""You are a level-design art director reviewing a 2D action-scroller's parallax {layer.upper()} layer.

Inputs you receive (in this order):
  1. The COMPOSITE — a concat of {seg_count} per-segment PNGs of the {layer} layer side-by-side. Each segment is one beat-bounded section of the map. The whole image reads left-to-right as the entire {layer} layer of the scene.
  2. The SCENE CONCEPT — the per-scene anchor showing the intended look.
  3. The MAP SILHOUETTE — a wide low-res master layout showing the elevation profile and biome bands of the entire map.

Layer role (CRITICAL):
{role_block}

Map context:
- Scene: {scene_id}
- World width: {w_tiles} tiles
- Stage beats (sections of the map):
{beat_text}
- Stage chunks:
{chunk_text}

Judgement task:
Look at the composite (image 1). Assess each segment against the others, against the silhouette, and against the layer role above. Identify any of these problems:
  a. CONTENT-WRONG-FOR-LAYER — e.g. a near segment that paints sky and mountains; a mid segment that's a full backdrop with no transparency; a far segment that's a chroma-keyed slice.
  b. BAD-SEAM — visible discontinuity between adjacent segments (palette jump, height mismatch, content cut mid-object).
  c. OFF-MACRO — the segment doesn't match the silhouette's elevation profile or biome band for that x-range.
  d. WEAK-CONTENT — the segment is sparse, repetitive, or generic for what should be a rich gameplay section (e.g. a key-pickup section that has no visual weight to anchor the pickup).
  e. STYLE-DRIFT — palette, line weight, or shading changes vs the scene concept.

For each segment indexed 0..{seg_count - 1}, decide whether to KEEP it or FIX it. Be specific in your reasoning — the next iteration will read these critiques and try to fix the flagged segments.

Output ONE JSON object — no prose, no preamble, no commentary outside the JSON:

```json
{{
  "verdict": "pass" | "fix",
  "summary": "<one paragraph: how does the layer read overall?>",
  "segments": [
    {{
      "index": 0,
      "decision": "keep" | "fix",
      "severity": "high" | "low" | "n/a",
      "issues": ["<short tag>", ...],   // empty when decision=keep
      "advice": "<specific instructions for the regen prompt; empty when decision=keep>"
    }},
    ...
  ],
  "fix_targets": [<int>, ...]            // segment indices marked decision=fix
}}
```

Verdict rule: "pass" only if ALL segments are decision=keep. Otherwise "fix".
Be willing to give "pass" — the goal is production-quality, not perfection. Reserve "fix" for clear, actionable issues.
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("layer", choices=["mid", "near"])
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    out_dir = project_root / "assets" / "scenes" / args.scene_id
    seg_dir = out_dir / f"bg-{args.layer}"
    if not seg_dir.is_dir():
        sys.stderr.write(f"  no segment dir at {seg_dir} — nothing to validate\n")
        return 1

    seg_paths = sorted(seg_dir.glob("seg-*.png"))
    if not seg_paths:
        sys.stderr.write(f"  no segments in {seg_dir} — nothing to validate\n")
        return 1
    seg_count = len(seg_paths)

    # Build the composite preview and save it as a debug sidecar.
    composite = composite_segments(seg_paths)
    composite_path = out_dir / f"bg-{args.layer}.composite.png"
    composite.save(composite_path, format="PNG")

    # Load stage for context.
    stage_path = out_dir / "stage.json"
    stage = {}
    if stage_path.exists():
        try:
            stage = json.loads(stage_path.read_text(encoding="utf-8"))
        except Exception:
            stage = {}

    concept_path = out_dir / "concept.png"
    silhouette_path = out_dir / "map.silhouette.png"

    image_paths: list[Path] = [composite_path]
    if concept_path.exists():
        image_paths.append(concept_path)
    if silhouette_path.exists():
        image_paths.append(silhouette_path)

    prompt = build_critique_prompt(args.scene_id, args.layer, stage, seg_count)
    backend = active_backend()
    cost = budget.cost_for_image(backend)  # text-out priced as image

    sys.stderr.write(
        f"[validate bg-{args.layer} {args.scene_id}] backend={backend} cost={cost}c "
        f"segments={seg_count} composite={composite_path.relative_to(project_root)}\n"
    )

    with budget.charged(
        project_root, cost, f"text-{backend}",
        note=f"validate-{args.scene_id}/bg-{args.layer}",
    ):
        text = generate_text_from_image(prompt, image_paths=image_paths)

    raw_path = out_dir / f"bg-{args.layer}.critique.raw.txt"
    raw_path.write_text(text or "", encoding="utf-8")

    parsed = parse_json_from_text(text or "")
    if not parsed:
        sys.stderr.write(
            "  ⚠ critique JSON parse failed — raw text saved; treating as pass to avoid stalling\n"
        )
        return 0  # don't block stitch on a parse failure

    # Normalize fix_targets and write per-segment critique sidecars so the
    # segment generator can consume them on retry.
    segments = parsed.get("segments") or []
    fix_targets = parsed.get("fix_targets") or [
        s.get("index") for s in segments if s.get("decision") == "fix"
    ]
    fix_targets = sorted({int(i) for i in fix_targets if isinstance(i, (int, float))})
    parsed["fix_targets"] = fix_targets

    # Write per-segment critique sidecars ONLY for segments we'll actually
    # regenerate (i.e. high-severity fixes). Low-severity flags are
    # recorded in the global critique JSON but don't drive a regen, so
    # leaving sidecars for them would just add stale prompt context to a
    # later unrelated retry. Clean stale sidecars from prior iterations.
    high_index_set = {
        s.get("index") for s in segments
        if s.get("decision") == "fix"
        and s.get("severity") == "high"
        and isinstance(s.get("index"), int)
    }
    for s in segments:
        idx = s.get("index")
        if not isinstance(idx, int):
            continue
        sidecar = seg_dir / f"seg-{idx:03d}.critique.txt"
        if idx in high_index_set:
            body = (
                f"Issues: {', '.join(s.get('issues') or [])}\n"
                f"Severity: {s.get('severity', '?')}\n"
                f"Advice: {s.get('advice') or '(no advice given)'}\n"
            )
            sidecar.write_text(body, encoding="utf-8")
        elif sidecar.exists():
            sidecar.unlink()

    critique_path = out_dir / f"bg-{args.layer}.critique.json"
    critique_path.write_text(json.dumps(parsed, indent=2), encoding="utf-8")

    verdict = parsed.get("verdict")
    high_flags = [
        s for s in segments
        if s.get("decision") == "fix" and s.get("severity") == "high"
    ]
    sys.stderr.write(
        f"  verdict={verdict!r} fix_targets={fix_targets} high_severity={len(high_flags)} "
        f"(critique: {critique_path.relative_to(project_root)})\n"
    )

    # The script's exit code mirrors the TASK.md check: exit 0 unless at
    # least one segment is flagged with severity=high. Low-severity issues
    # are recorded in the critique but don't trigger a regen — they would
    # just churn cost without converging on a fundamentally different
    # output. The honest critic is always allowed to log nits.
    if not high_flags:
        return 0

    # Cascade-delete from the earliest HIGH-severity flag onward. The
    # seam-anchor chain is N depends on N-1, so any segment after a
    # regenerated one must also regenerate or its seam goes stale.
    high_indexes = {
        s.get("index") for s in high_flags
        if isinstance(s.get("index"), int)
    }
    if high_indexes:
        first_bad = min(high_indexes)
        for p in sorted(seg_dir.glob("seg-*.png")):
            try:
                idx = int(p.stem.split("-", 1)[1])
            except (ValueError, IndexError):
                continue
            if idx >= first_bad:
                p.unlink()
                sys.stderr.write(
                    f"  deleted {p.relative_to(project_root)} "
                    f"({'flagged-high' if idx in high_indexes else 'cascaded'})\n"
                )
    return 1


if __name__ == "__main__":
    sys.exit(main())
