#!/usr/bin/env python3
"""Replicate a scene-spec.json horizontally N times to stress-test the
concept generator on long maps. Aspect = N * source_aspect.

Usage:
  python scripts/stretch_scene_spec.py <src_scene_id> <dst_scene_id> --repeat 4
"""
from __future__ import annotations
import argparse, copy, json, sys
from pathlib import Path

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--repeat", type=int, default=4)
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[1]
    src = root / "assets" / "scenes" / args.src / "bg-near" / "scene-spec.json"
    dst = root / "assets" / "scenes" / args.dst / "bg-near" / "scene-spec.json"
    spec = json.loads(src.read_text(encoding="utf-8"))

    canvas_w = int(spec["canvas"]["width_px"])
    tile_size = int(spec["canvas"]["tile_size_px"])
    width_tiles = canvas_w // tile_size

    # New canvas spans repeat * canvas_w
    spec["scene_id"] = args.dst
    spec["canvas"]["width_px"] = canvas_w * args.repeat

    # ground_polyline is no longer authoritative — the tilemap grid below
    # carries it. Drop it on stretch if present (legacy specs may still
    # have it; keep them roughly accurate by stretching x coords too).
    if "ground_polyline" in spec:
        base_poly = list(spec.get("ground_polyline", []))
        new_poly = []
        for r in range(args.repeat):
            for i, s in enumerate(base_poly):
                if r > 0 and i == 0:
                    continue
                new_poly.append({
                    "x_tile": s["x_tile"] + r * width_tiles,
                    "y_tile": s["y_tile"],
                    "x_px":   s["x_px"]   + r * canvas_w,
                    "y_px":   s["y_px"],
                })
        spec["ground_polyline"] = new_poly

    # Replicate chunks
    base_chunks = list(spec.get("chunks", []))
    new_chunks = []
    next_idx = 0
    for r in range(args.repeat):
        for c in base_chunks:
            cc = copy.deepcopy(c)
            cc["chunk_index"] = next_idx
            cc["chunk_id"] = f"chunk-{next_idx}"
            cc["x_tile_range"] = [c["x_tile_range"][0] + r * width_tiles,
                                   c["x_tile_range"][1] + r * width_tiles]
            cc["x_px_range"]  = [c["x_px_range"][0] + r * canvas_w,
                                  c["x_px_range"][1] + r * canvas_w]
            for p in cc.get("props", []):
                if "x_px" in p: p["x_px"] += r * canvas_w
                if "cx" in p: p["cx"] += r * canvas_w
                if "points" in p:
                    p["points"] = [[x + r * canvas_w, y] for (x, y) in p["points"]]
            for z in cc.get("leave_room_zones", []):
                z["x_lo"] += r * canvas_w
                z["x_hi"] += r * canvas_w
            new_chunks.append(cc)
            next_idx += 1
    spec["chunks"] = new_chunks

    # Drop any legacy in-spec terrain block — terrain.json is now the
    # canonical source. We stretch terrain.json separately below.
    if "terrain" in spec:
        del spec["terrain"]
    terrain = {}

    # Stretch the standalone terrain.json (rows multiply N times,
    # grid_size[0] *= repeat). The grid IS the canonical layout; no
    # per-feature shifting needed.
    src_terrain_p = root / "assets" / "scenes" / args.src / "terrain.json"
    dst_terrain_p = root / "assets" / "scenes" / args.dst / "terrain.json"
    if src_terrain_p.exists():
        t = json.loads(src_terrain_p.read_text(encoding="utf-8"))
        gs = t.get("grid_size") or [0, 0]
        rows = t.get("rows") or []
        if gs[0] > 0 and rows:
            t["scene_id"] = args.dst
            t["grid_size"] = [gs[0] * args.repeat, gs[1]]
            t["rows"] = [r * args.repeat for r in rows]
        dst_terrain_p.parent.mkdir(parents=True, exist_ok=True)
        dst_terrain_p.write_text(json.dumps(t, indent=2), encoding="utf-8")
        terrain = t

    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(spec, indent=2), encoding="utf-8")
    aspect = spec["canvas"]["width_px"] / spec["canvas"]["height_px"]
    print(f"  src:    {src.relative_to(root)}")
    print(f"  dst:    {dst.relative_to(root)}")
    print(f"  repeat: x{args.repeat}")
    print(f"  canvas: {spec['canvas']['width_px']}x{spec['canvas']['height_px']}  aspect {aspect:.2f}:1")
    print(f"  chunks: {len(new_chunks)}")
    if terrain.get("grid_size"):
        print(f"  grid:   {terrain['grid_size'][0]}x{terrain['grid_size'][1]}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
