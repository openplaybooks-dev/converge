#!/usr/bin/env python3
"""generate_stage.py — Author the per-scene stage blueprint.

Reads:
  - assets/scenes/{scene_id}/scene-plan.json    (per-layer art direction)
  - assets/scenes/{scene_id}/SPEC.md            (scene narrative spec)
  - assets/scenes.json[scene_id]                (declared characters / scene_props / bg config)
  - assets/game.json                            (tile size, view mode, world size hints)

Writes:
  - assets/scenes/{scene_id}/stage.json         (the blueprint everyone downstream reads)
  - assets/scenes/{scene_id}/stage.prompt.txt   (debug sidecar)
  - assets/scenes/{scene_id}/stage.raw.txt      (model's raw text, for debugging on parse failure)

The blueprint defines world dimensions in tile units, contiguous chunks
left-to-right (each with ground type + narrative + placed scene props),
and computed background sizing (target_width_px, segment_width_px,
overlap_px). Background and tilemap downstream tasks consume this.

Cost: 1 text-out call (~5¢ on Gemini).

Usage:
  python scripts/generate_stage.py <scene_id>
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import textwrap
from pathlib import Path

from lib import budget
from lib.image_api import active_backend, generate_image_with_edit
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


# Defaults applied when scene-plan or game.json doesn't pin them.
DEFAULT_TILE_SIZE_PX = 16
DEFAULT_WORLD_HEIGHT_TILES = 18
DEFAULT_SEGMENT_WIDTH_PX = 1024
DEFAULT_OVERLAP_PX_MID = 128
DEFAULT_OVERLAP_PX_NEAR = 256

# Map length is computed from gameplay duration × player walk speed plus
# the camera viewport. A bare default is only used when nothing better is
# available — production scenes should set scene.gameplay.target_duration_sec.
DEFAULT_PLAYER_TILES_PER_SEC = 5.0       # baseline side-scroller walk speed
DEFAULT_CAMERA_VIEW_TILES = 20           # ~1280px viewport at 64px per tile
DEFAULT_TARGET_DURATION_SEC = {
    # tutorial / first-room scenes — short.
    "tutorial": 30,
    "intro":    25,
    # standard exploration / combat rooms.
    "default":  60,
    # boss arenas / set-pieces — longer.
    "boss":     90,
    "long":     120,
}


def compute_world_width_tiles(scene: dict, game: dict) -> int:
    """Map width = camera_view + (player_speed × duration) - 1.

    Reads scene.gameplay.{target_duration_sec, player_tiles_per_sec,
    camera_view_tiles, scene_kind} when present; falls back to defaults.
    """
    gp = scene.get("gameplay") or {}
    duration_s = gp.get("target_duration_sec")
    if not isinstance(duration_s, (int, float)) or duration_s <= 0:
        kind = (gp.get("scene_kind") or "default").lower()
        duration_s = DEFAULT_TARGET_DURATION_SEC.get(kind, DEFAULT_TARGET_DURATION_SEC["default"])
    speed = gp.get("player_tiles_per_sec") or (
        ((game.get("playbook_overrides") or {}).get("player_tiles_per_sec"))
    )
    if not isinstance(speed, (int, float)) or speed <= 0:
        speed = DEFAULT_PLAYER_TILES_PER_SEC
    view = gp.get("camera_view_tiles") or (
        ((game.get("playbook_overrides") or {}).get("camera_view_tiles"))
    )
    if not isinstance(view, (int, float)) or view <= 0:
        view = DEFAULT_CAMERA_VIEW_TILES
    raw = view + speed * duration_s - 1
    # Snap up to a multiple of 4 tiles for nicer chunk boundaries.
    return int(((raw + 3) // 4) * 4)


def load_scene_entry(project_root: Path, scene_id: str) -> dict:
    p = project_root / "assets" / "scenes.json"
    if not p.exists():
        raise SystemExit(f"{p} not found")
    for s in json.loads(p.read_text(encoding="utf-8")):
        if s.get("id") == scene_id:
            return s
    raise SystemExit(f"scene {scene_id!r} not found in {p}")


def load_game(project_root: Path) -> dict:
    p = project_root / "assets" / "game.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def load_scene_plan(project_root: Path, scene_id: str) -> dict:
    p = project_root / "assets" / "scenes" / scene_id / "scene-plan.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def load_spec_md(project_root: Path, scene_id: str) -> str:
    p = project_root / "assets" / "scenes" / scene_id / "SPEC.md"
    if not p.exists():
        return ""
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return ""


def parse_json_from_text(text: str) -> dict | None:
    """Pull a JSON object out of the model's text output. Tolerates
    code-fenced blocks (```json ... ```) and leading/trailing prose."""
    if not text:
        return None
    # Strip code fence if present.
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fenced:
        candidate = fenced.group(1)
    else:
        candidate = text
    # Find the first { ... } that is balanced.
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


def build_prompt(
    scene_id: str,
    scene: dict,
    spec_md: str,
    plan: dict,
    game: dict,
    defaults: dict,
) -> str:
    biome = scene.get("biome", "")
    description = (scene.get("description") or "").strip()
    name = scene.get("name", scene_id)
    declared_chars = scene.get("characters") or []
    declared_props = scene.get("scene_props") or []
    declared_shared = scene.get("shared_props") or []
    bg_layers = (scene.get("background") or {}).get("layers") or []
    tile_size = defaults["tile_size_px"]
    default_w = defaults["world_width_tiles"]
    default_h = defaults["world_height_tiles"]

    target_w = defaults["world_width_tiles"]
    chunk_count_hint = max(4, min(8, target_w // 24))
    return textwrap.dedent(f"""\
        You are designing the playable layout of a 2D action-scroller scene
        as a structured JSON blueprint. Downstream pipeline tasks read this
        blueprint and use it to size backgrounds, generate tilemap chunks,
        and place scene props — so it MUST be specific, concrete, and
        self-consistent. Treat this like blocking out a Hollow Knight /
        Celeste / Dead Cells room: every section of the map should have a
        reason to exist, and the map should read as a sequence of beats,
        not a flat strip.

        Scene: {name} (id: {scene_id!r})
        Biome: {biome}
        Description:
        {description}

        ART / NARRATIVE SPEC (from SPEC.md, supplemental context):
        ```
        {spec_md.strip()[:4000]}
        ```

        Declared in scenes.json:
          - characters[]:   {json.dumps(declared_chars)}
          - scene_props[]:  {json.dumps([p.get('id') if isinstance(p, dict) else p for p in declared_props])}
          - shared_props[]: {json.dumps(declared_shared)}
          - bg layers:      {json.dumps([l.get('id') if isinstance(l, dict) else l for l in bg_layers])}

        From scene-plan.json (per-layer art direction already done):
        ```json
        {json.dumps((plan.get('bg') or {{}}), indent=2)[:1500]}
        ```

        Game-wide constants (HARD — do not change):
          - view: {game.get('view', 'side-scroller')}
          - tile_size_px: {tile_size}
          - world.width_tiles: {target_w}   (computed from gameplay duration × walk speed; do not alter)
          - world.height_tiles: {default_h}
          - target chunk count: ~{chunk_count_hint} chunks (one beat per chunk roughly)

        Output ONE JSON object with the following schema:

        ```json
        {{
          "scene_id": "{scene_id}",
          "tile_size_px": {tile_size},
          "world": {{
            "width_tiles":  {target_w},
            "height_tiles": {default_h}
          }},
          "elevation": [               // ground silhouette samples (y_tile = playable floor height at this x_tile)
            {{ "x_tile": <int>, "y_tile": <int> }}  // sample every ~{max(4, target_w // 16)} tiles. y_tile=0 is the bottom; larger = higher ground.
            // ... 12-32 samples covering [0, {target_w}]; MUST vary by at least 4 tiles between min and max
          ],
          "beats": [                   // {chunk_count_hint}-{chunk_count_hint + 2} narrative beats left-to-right — the gameplay rhythm.
            {{
              "x_tile":  <int>,
              "kind":    <"spawn" | "platform-up" | "platform-down" | "hazard" | "pickup" | "encounter" | "set-piece" | "exit">,
              "label":   <short string — e.g. "first-jump", "key-pickup", "water-crossing">
            }}
          ],
          "platforms": [               // axis-aligned playable surfaces at non-floor heights — for jumps, drops, vertical interest.
            {{
              "x_tiles":  [<int>, <int>],   // [start, end) along x
              "y_tile":   <int>,            // top surface height (player stands on this)
              "kind":     <"floor" | "ledge" | "elevated" | "ceiling" | "moving">,
              "label":    <short string>
            }}
            // MUST include at least 2 non-floor platforms unless the scene description forbids verticality.
          ],
          "hazards": [                 // pits, spikes, water, enemies — anything the player must avoid or fight.
            {{
              "x_tile": <int>,
              "kind":   <"pit" | "spikes" | "water" | "fire" | "enemy-melee" | "enemy-ranged" | "moving-hazard">,
              "label":  <short string>
            }}
            // MUST include at least 2 hazards unless the scene is explicitly a no-threat tutorial intro.
          ],
          "chunks": [                 // ~{chunk_count_hint} contiguous left-to-right chunks; must tile world.width_tiles with no gaps and no overlaps.
            {{
              "id":             <kebab-case string>,
              "x_tiles":        [<int>, <int>],
              "biome_variant":  <string>,                  // e.g. "grassland-open", "grassland-path", "ruins-overgrown"
              "ground_type":    <string>,                  // primary tile family covering the floor in this chunk
              "elevation_range": [<int>, <int>],           // [min y_tile, max y_tile] of ground inside this chunk's x range
              "platforms":      [<int>, ...],              // indices into top-level platforms[] that lie in this chunk's x range
              "hazards":        [<int>, ...],              // indices into top-level hazards[] that lie in this chunk
              "transitions":    [<string>, ...],           // transition tile descriptors (e.g. "path-corner-NW@x18", "grass-to-water@x42")
              "scene_props":    [
                {{ "id": <string>, "x_tiles": <int>, "y_tiles": <int> }}
              ],
              "narrative":      <one or two sentences: what does the player encounter and learn in this chunk?>
            }}
          ],
          "background": {{
            "target_width_px":   <int>,   // = world.width_tiles * tile_size_px
            "target_height_px":  <int>,   // = world.height_tiles * tile_size_px
            "segment_width_px":  {DEFAULT_SEGMENT_WIDTH_PX},
            "overlap_px": {{
              "mid":  {DEFAULT_OVERLAP_PX_MID},
              "near": {DEFAULT_OVERLAP_PX_NEAR}
            }}
          }},
          "tilemap_chunks": [                              // one entry per chunks[]; same x_tiles boundaries
            {{ "x_tiles": [<int>, <int>], "tile_set": [<tile_id>, ...] }}
          ]
        }}
        ```

        Hard rules:
        - `world.width_tiles` MUST equal {target_w}. Do not change this value — it was computed from gameplay duration.
        - `world.height_tiles` MUST equal {default_h}.
        - Every entry in scenes.json `characters[]`, `scene_props[]`, and `shared_props[]` must appear in exactly one chunk's `scene_props[]`. None should be dropped.
        - `chunks[].x_tiles` ranges must be contiguous and cover `[0, {target_w}]` exactly — no gaps, no overlaps.
        - `tilemap_chunks` must have the same x_tiles boundaries as `chunks`.
        - `background.target_width_px` must equal {target_w * tile_size}.
        - `background.target_height_px` must equal {default_h * tile_size}.
        - `elevation` samples MUST start at x_tile=0 and end at x_tile={target_w}, sorted ascending; y_tile values must span a range of at least 4 tiles between the minimum and maximum (a flat profile is rejected).
        - `beats` MUST tell an action-scroller arc: spawn → first-interaction → middle set-piece → climax/exit. Order ascending by x_tile.
        - At least one `kind:"spawn"` beat at x_tile≤2 and one `kind:"exit"` beat at x_tile≥{target_w - 2}.
        - Pickups declared in scenes.json must appear as `kind:"pickup"` beats AND be placed in the chunk containing their x_tile.
        - `platforms[]` must include at least 2 non-floor entries (kind in ["ledge","elevated","moving"]) unless the scene description explicitly says "no verticality".
        - `hazards[]` must include at least 2 entries unless the scene is a "no-threat tutorial intro".
        - Each chunk's `narrative` is one or two sentences naming concrete features the player encounters in that x range — reference the platforms / hazards / props / transitions that fall inside it.
        - Output ONLY the JSON object. No prose outside the code fence.
    """)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene = load_scene_entry(project_root, args.scene_id)
    spec_md = load_spec_md(project_root, args.scene_id)
    plan = load_scene_plan(project_root, args.scene_id)
    game = load_game(project_root)

    out_dir = project_root / "assets" / "scenes" / args.scene_id
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "stage.json"
    prompt_path = out_dir / "stage.prompt.txt"
    raw_path = out_dir / "stage.raw.txt"

    tile_size_px = (
        (game.get("asset_categories") or {}).get("tilemap", {}).get("tile_dimensions", [DEFAULT_TILE_SIZE_PX, DEFAULT_TILE_SIZE_PX])
    )
    if isinstance(tile_size_px, list) and tile_size_px:
        tile_size_px = int(tile_size_px[0])
    else:
        tile_size_px = DEFAULT_TILE_SIZE_PX

    overrides = (game.get("playbook_overrides") or {})
    default_h = int(overrides.get("world_height_tiles", DEFAULT_WORLD_HEIGHT_TILES))
    # Compute target width from gameplay duration × walk speed + camera.
    # The LLM is told the answer (rather than asked to choose) so the map
    # is sized for the scene, not the model's vague intuition.
    target_w = compute_world_width_tiles(scene, game)

    defaults = {
        "tile_size_px": tile_size_px,
        "world_width_tiles": target_w,
        "world_height_tiles": default_h,
    }

    prompt = build_prompt(args.scene_id, scene, spec_md, plan, game, defaults)
    prompt_path.write_text(prompt, encoding="utf-8")

    backend = active_backend()
    cost = budget.cost_for_image(backend)  # text-out priced as image equivalent in this project
    sys.stderr.write(
        f"[stage:{args.scene_id}] backend={backend} cost={cost}c\n"
    )

    with budget.charged(
        project_root, cost, f"text-{backend}",
        note=f"stage-{args.scene_id}",
    ):
        text = generate_text_from_image(prompt, image_paths=None)

    raw_path.write_text(text or "", encoding="utf-8")
    parsed = parse_json_from_text(text or "")
    if not parsed:
        sys.stderr.write("  ⚠ stage JSON parse failed — raw text saved to stage.raw.txt\n")
        return 1

    # Width is computed deterministically; if the model returned a
    # different number we override it. Height comes from defaults.
    w_tiles = target_w
    h_tiles = default_h
    bg = parsed.setdefault("background", {})
    bg["target_width_px"] = w_tiles * tile_size_px
    bg["target_height_px"] = h_tiles * tile_size_px
    bg.setdefault("segment_width_px", DEFAULT_SEGMENT_WIDTH_PX)
    overlap = bg.setdefault("overlap_px", {})
    if isinstance(overlap, dict):
        overlap.setdefault("mid", DEFAULT_OVERLAP_PX_MID)
        overlap.setdefault("near", DEFAULT_OVERLAP_PX_NEAR)
    parsed["world"] = {"width_tiles": w_tiles, "height_tiles": h_tiles}
    parsed["scene_id"] = args.scene_id
    parsed["tile_size_px"] = tile_size_px

    # Ensure platforms[] / hazards[] exist so downstream consumers can
    # iterate them unconditionally even if the model omitted them.
    parsed.setdefault("platforms", [])
    parsed.setdefault("hazards", [])

    json_path.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
    sys.stderr.write(
        f"  wrote {json_path.relative_to(project_root)} "
        f"(world={w_tiles}x{h_tiles} tiles, "
        f"bg={bg['target_width_px']}x{bg['target_height_px']} px, "
        f"chunks={len(parsed.get('chunks') or [])}, "
        f"beats={len(parsed.get('beats') or [])}, "
        f"elevation_samples={len(parsed.get('elevation') or [])})\n"
    )

    # ── Silhouette pass ────────────────────────────────────────────────
    # One image-gen call producing a wide low-res thumbnail of the entire
    # map: ground silhouette + biome bands + beat markers. Every downstream
    # image task (bg-far, per-segment bg-mid/near) references this so the
    # whole map stays visually coherent at the macro level.
    silhouette_path = out_dir / "map.silhouette.png"
    silhouette_prompt_path = out_dir / "map.silhouette.prompt.txt"
    silhouette_seed_path = out_dir / "map.silhouette.seed.txt"

    visual_target = project_root / "assets" / "visual-target.png"

    silhouette_prompt = build_silhouette_prompt(args.scene_id, parsed, scene)
    silhouette_prompt_path.write_text(silhouette_prompt, encoding="utf-8")

    img_cost = budget.cost_for_image(backend)
    sys.stderr.write(
        f"[stage:{args.scene_id}] silhouette  backend={backend} cost={img_cost}c\n"
    )
    with budget.charged(
        project_root, img_cost, f"image-{backend}",
        note=f"stage-{args.scene_id}/silhouette",
    ):
        if visual_target.exists():
            img_bytes, seed_used = generate_image_with_edit(
                silhouette_prompt,
                visual_target,
                [],
                aspect_ratio="16:9",
                resolution=(1536, 384),  # very wide, short — silhouette aspect
            )
        else:
            from lib.image_api import generate_image
            img_bytes, seed_used = generate_image(
                silhouette_prompt,
                aspect_ratio="16:9",
                resolution=(1536, 384),
            )

    silhouette_path.write_bytes(img_bytes)
    silhouette_seed_path.write_text(str(seed_used), encoding="utf-8")
    sys.stderr.write(
        f"  wrote {silhouette_path.relative_to(project_root)} (seed={seed_used})\n"
    )
    return 0


def build_silhouette_prompt(scene_id: str, stage: dict, scene: dict) -> str:
    """Compose a wide-thumbnail silhouette prompt from the stage blueprint."""
    biome = scene.get("biome", "")
    description = (scene.get("description") or "").strip()
    world = stage.get("world") or {}
    w_tiles = world.get("width_tiles", "?")
    h_tiles = world.get("height_tiles", "?")
    elevation = stage.get("elevation") or []
    beats = stage.get("beats") or []
    chunks = stage.get("chunks") or []

    elev_text = ", ".join(
        f"({e.get('x_tile')},{e.get('y_tile')})" for e in elevation
    ) or "(no elevation samples)"
    beat_text = "\n".join(
        f"  - x_tile={b.get('x_tile')} {b.get('kind')}: {b.get('label')}"
        for b in beats
    ) or "  - (no beats)"
    chunk_text = "\n".join(
        f"  - chunk {c.get('id')} x_tiles={c.get('x_tiles')} ground={c.get('ground_type')}: {c.get('narrative', '')}"
        for c in chunks
    ) or "  - (no chunks)"

    return textwrap.dedent(f"""\
        Render a wide LOW-RESOLUTION SILHOUETTE THUMBNAIL of an entire 2D action-scroller map.
        This image is the master reference every downstream task reads for big-picture
        layout — it does NOT need fine detail. It must read clearly at small size and
        accurately reflect the elevation profile and biome bands listed below.

        Scene: {scene.get('name', scene_id)} (id: {scene_id!r})
        Biome: {biome}
        Description:
        {description}

        World: {w_tiles} tiles wide × {h_tiles} tiles tall.

        Elevation profile (ground silhouette samples; (x_tile, y_tile) pairs):
        {elev_text}

        Beats along x (gameplay rhythm — annotate visually if you can):
{beat_text}

        Chunks left-to-right (biome variants):
{chunk_text}

        Composition rules:
        - Aspect: WIDE — 16:9 or wider, the whole map left-to-right in one frame.
        - Bottom 35-50% of the canvas is the ground silhouette. Follow the elevation
          profile faithfully: where y_tile is higher, the silhouette is taller;
          where lower, shorter. The silhouette should rise and fall, NOT be a flat strip.
        - Top 50-65% is sky / far background — soft cool gradient with biome-tinted
          horizon. Distant mountain or treeline silhouette in the upper-mid third.
        - Use 3-5 flat colors max. NO fine detail. NO characters. NO UI. NO text.
        - Match the palette and mood of the supplied visual-target reference image.

        Style: silhouette poster art. Think Hollow Knight key-art elevation poster, or
        a level-design block-in pass. Clean, readable, low-frequency.
    """)


if __name__ == "__main__":
    sys.exit(main())
