#!/usr/bin/env python3
"""author_landscape_prompt.py — AI authors the landscape preview prompt.

Reads the project's root art-style document (`assets/ART_BIBLE.md`),
the binding visual style master (`assets/visual-target.png`, sent
as a vision input), and the scene's token list (from
`scene.assembly.json`), then asks an AI to *customize* the root
style into a landscape-specific prompt that:

- Translates the visual-target image into rich painterly language
  (brushwork, finish, atmosphere, palette, edges, mood). The
  painter never sees the visual target image — only this AI's
  description of it. So this step is where image style becomes
  text style.
- Pulls environment-relevant rules from ART_BIBLE.md (palette,
  line/shading, environment forms, atmospheric depth, negatives) —
  drops character / UI / prop language.
- Names the scene's first-window landmarks (mountain layers,
  ground line, foreground branch, rocks, etc.) so the painter has
  spatial language.
- Outputs a self-contained prompt suitable for image-edit on the
  cropped skeleton.

Output: `assets/scenes/{scene_id}/samples/landscape/landscape.prompt.md`.
That file is the single binding instruction read later by
`scene_preview_paint.py`.

This script does NOT do image generation. It does ONE text call
(Gemini text-out) per scene. Cost-gated via `lib.budget.charged`.

Usage:
  python scripts/author_landscape_prompt.py demo-grassland
  python scripts/author_landscape_prompt.py demo-grassland --dry-run
  python scripts/author_landscape_prompt.py demo-grassland --force
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from tokens_compile import find_project_root
from lib import budget
from lib.image_api import active_backend
from lib.image_api_gemini import generate_text_from_image


PROMPT_TEMPLATE = """\
You are authoring an image-generation prompt for a 1024x1024
landscape preview of a 2D side-scrolling level. The prompt will be
sent to Gemini 2.5 Flash Image (image-edit mode) with a SKELETON
image as the base — no reference images at paint time. So your
output prompt is the ONLY style signal the painter receives.

Your output must be a SINGLE Markdown document, ready to use
verbatim as the image-edit prompt. Don't wrap it in code fences.
Don't add commentary. Don't say "here is the prompt" — just emit
the prompt.

# THE STYLE MASTER (attached as image input #1)

The first attached image is `assets/visual-target.png`, the
project's binding visual style master. STUDY IT carefully. Your
output prompt must instruct the painter to produce art that looks
like it came from the same hand as this image:

- Brushwork density and texture (visible strokes? smooth gradients?
  watercolor wash? ink lines? grain?).
- Level of finish (concept-art polish vs flat illustration vs game
  screenshot).
- Atmospheric language (haze depth, light direction, color
  temperature shifts between near and far).
- Palette in practice (which colors actually appear, in what
  proportions; warm/cool balance; saturation levels).
- Edge treatment (soft, hard, vignetted; how outlines are
  expressed if at all).
- Mood and time-of-day signals.

When you write the output prompt, DESCRIBE these properties of the
visual-target image in concrete words. The painter cannot see the
image; the painter only reads your text. So your text must be rich
enough that following it produces art that sits next to
visual-target.png in style.

# ROOT ART BIBLE (the project's written style rules)

This is `assets/ART_BIBLE.md`, the project's environment visual
grammar. The painter must obey it AS WELL AS match the visual
target above. If the bible and the visual target conflict on
specifics, the visual target wins on rendering and finish; the
bible wins on hard negatives (no pixel art, no UI, etc).

```
{art_bible}
```

# SCENE CONTEXT

Scene id: {scene_id}
Biome: {biome}
First-window landmarks (back-to-front, with positions and notes):

```
{tokens}
```

# WHAT THE OUTPUT PROMPT MUST DO

Produce an image-edit prompt that:

1. Opens with a clear RESTYLE instruction: the base image is a
   draft / skeleton; KEEP its composition, scale, and broad palette
   hues; REPLACE its flat-vector rendering with painted finish.
2. **Translates the visual-target image into rich style language.**
   Concrete descriptors of brushwork, finish, atmosphere, palette,
   edge treatment, mood — every observation grounded in what you
   actually see in the attached image. The painter must end up with
   art that visibly matches THIS image, not just the bible's text
   rules.
3. Pulls the environment-relevant rules from the ROOT ART BIBLE
   (palette hexes, line/shading, atmospheric depth, environment
   forms, environment-applicable negatives). Quote or paraphrase
   the bible — do NOT just say "follow the art bible".
4. Names the actual landmarks present in this scene's first window
   (mountains, trees, ground, branch, rock, etc.) so the painter
   has spatial vocabulary keyed to THIS scene.
5. Spells out hard rules: positions stay within +/-3 percent; no
   UI, characters, text, HUD; output exactly 1024x1024 RGBA.
6. Tells the painter to honor the atmospheric depth model —
   distant elements desaturated/cooler, near elements
   saturated/crisper.

# WHAT THE OUTPUT PROMPT MUST NOT DO

- No character data (no knight armor, no mage robe, no proportions).
- No idea.md content (game-mechanic descriptions, story).
- No "16-bit / pixel art / retro" language — the bible already says
  no to those, but don't even mention them as comparisons.
- No image-gen meta-commentary ("I will paint", "as an AI...").
  The output is an instruction, not a conversation.
- DO NOT just paste the art bible verbatim. The painter doesn't
  need a copy of the bible; it needs concrete painterly direction
  drawn from BOTH the bible AND the visual-target image.

# LENGTH

Aim for 800-1500 words. Rich style language from the visual-target
takes more room than the bible alone; that's expected and good.

Now emit the prompt MD.
"""


def load_tokens(project_root: Path, biome: str) -> dict[str, dict]:
    biome_dir = project_root / "assets" / "tokens" / biome
    tokens: dict[str, dict] = {}
    # Per-asset folder layout: each token's compiled JSON sits at
    # `{category}/{token-id}/token.json`.
    for js in biome_dir.rglob("token.json"):
        data = json.loads(js.read_text(encoding="utf-8"))
        tokens[data["id"]] = data
    return tokens


LANDSCAPE_EXCLUDED_LAYERS = {"fg"}


def render_first_window_tokens(
    assembly: dict,
    tokens: dict,
    window_cols: int = 12,
    window_rows: int = 12,
) -> str:
    layer_order = {layer["id"]: i for i, layer in enumerate(assembly["layers"])}
    visible: list[tuple[int, int, int, str, dict]] = []

    for inst in assembly["tokens"]:
        layer_id = inst["layer"]
        # Match scene_layered_assemble.py's landscape-variant exclusions:
        # fg is a near-camera frame, not part of the landscape preview.
        if layer_id in LANDSCAPE_EXCLUDED_LAYERS:
            continue
        token = tokens.get(inst["token"])
        if token is None:
            continue
        ax, ay = inst["at"]
        bw, bh = token["footprint"]
        anchor = token.get("anchor", "bottom-left")
        if anchor == "bottom-left":
            x_lo, y_lo = ax, ay - bh + 1
        elif anchor == "top-left":
            x_lo, y_lo = ax, ay
        elif anchor == "center":
            x_lo, y_lo = ax - bw // 2, ay - bh // 2
        else:
            x_lo, y_lo = ax, ay
        x_hi = x_lo + bw - 1
        y_hi = y_lo + bh - 1
        if x_hi < 0 or x_lo >= window_cols:
            continue
        if y_hi < 0 or y_lo >= window_rows:
            continue
        if token.get("kind", "terrain") == "dynamic":
            continue
        visible.append((layer_order.get(layer_id, 99), ax, ay, layer_id, token))

    visible.sort(key=lambda t: (t[0], t[1], t[2]))
    if not visible:
        return "(no tokens visible in the first window)"

    lines: list[str] = []
    for _, ax, ay, layer_id, token in visible:
        bw, bh = token["footprint"]
        notes = (token.get("visual") or {}).get("art_notes", "").strip().replace("\n", " ")
        line = f"- [{layer_id}] {token['id']:<22} at_tile=({ax},{ay}) footprint={bw}x{bh}"
        if notes:
            line += f" — {notes}"
        lines.append(line)
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    ap.add_argument("scene_id")
    ap.add_argument("--dry-run", action="store_true", help="print the meta-prompt; no AI call, no write")
    ap.add_argument("--force", action="store_true", help="re-author even if landscape.prompt.md exists")
    args = ap.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id

    art_bible_path = project_root / "assets" / "ART_BIBLE.md"
    if not art_bible_path.exists():
        print(f"error: {art_bible_path} not found", file=sys.stderr)
        return 1
    art_bible = art_bible_path.read_text(encoding="utf-8").strip()

    visual_target_path = project_root / "assets" / "visual-target.png"
    if not visual_target_path.exists():
        print(
            f"error: {visual_target_path} not found — author needs the visual target as style master",
            file=sys.stderr,
        )
        return 1

    assembly_path = scene_dir / "scene.assembly.json"
    if not assembly_path.exists():
        print(f"error: {assembly_path} not found — run visual_mapping_compile first", file=sys.stderr)
        return 1
    assembly = json.loads(assembly_path.read_text(encoding="utf-8"))

    biome = assembly["biome"]
    tokens = load_tokens(project_root, biome)
    tokens_listing = render_first_window_tokens(assembly, tokens)

    samples_dir = scene_dir / "samples" / "landscape"
    samples_dir.mkdir(parents=True, exist_ok=True)
    out_path = samples_dir / "landscape.prompt.md"

    if out_path.exists() and not args.force and not args.dry_run:
        print(f"  {out_path.relative_to(project_root)} already exists — pass --force to regenerate")
        return 0

    meta_prompt = PROMPT_TEMPLATE.format(
        art_bible=art_bible,
        scene_id=args.scene_id,
        biome=biome,
        tokens=tokens_listing,
    )

    if args.dry_run:
        print(f"\n--- author_landscape_prompt DRY-RUN for '{args.scene_id}' ({len(meta_prompt)} chars) ---")
        print(meta_prompt)
        return 0

    backend = active_backend()
    cost = budget.cost_for_image(backend)
    print(f"  [{args.scene_id}] authoring landscape prompt via {backend}, cost={cost}¢")

    with budget.charged(project_root, cost, f"text-{backend}", note=f"landscape-prompt {args.scene_id}"):
        result = generate_text_from_image(meta_prompt, image_paths=[visual_target_path])

    if not result.strip():
        print(f"error: empty AI response", file=sys.stderr)
        return 1

    out_path.write_text(result.rstrip() + "\n", encoding="utf-8")
    print(f"  wrote {out_path.relative_to(project_root)} ({len(result)} chars)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
