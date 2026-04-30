#!/usr/bin/env python3
"""tokens_preview.py — emit static previews of a biome's tokens library.

Reads `assets/tokens/{biome}/index.json` plus each token's per-token `*.json`
and `*.sketch.svg`, and writes:

  - `assets/tokens/{biome}/preview.html` — self-contained HTML contact sheet
    (no server, no JS fetch — embeds each SVG inline with a footprint grid).
  - `assets/tokens/{biome}/PREVIEW.md`   — Markdown reference doc grouped by
    category, with TOC + per-token sketch image refs + spec table.

Usage:
  python scripts/tokens_preview.py                       # all biomes, both formats
  python scripts/tokens_preview.py grassland             # one biome, both formats
  python scripts/tokens_preview.py grassland -f md       # md only
  python scripts/tokens_preview.py grassland -f html     # html only
  python scripts/tokens_preview.py grassland -o /tmp/g.html  # one biome, one format, custom path
"""

from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path
from typing import Any


CATEGORY_ORDER = ["ground", "platform", "hazard", "decoration", "background", "marker"]
CATEGORY_LABELS = {
    "ground": "Ground",
    "platform": "Platform",
    "hazard": "Hazard",
    "decoration": "Decoration",
    "background": "Background",
    "marker": "Marker",
}
CATEGORY_TO_FOLDER = {
    "ground": "ground",
    "platform": "platforms",
    "hazard": "hazards",
    "decoration": "decorations",
    "background": "background",
    "marker": "markers",
}
TILE_PX = 48          # source sketch unit (matches tokens spec)
PREVIEW_TILE_PX = 56  # displayed tile size in the preview tiles


def find_project_root(start: Path | None = None) -> Path:
    cur = (start or Path(__file__)).resolve()
    while True:
        if (cur / "assets" / "tokens").is_dir():
            return cur
        if cur.parent == cur:
            raise FileNotFoundError("could not locate project root (no assets/tokens/ found)")
        cur = cur.parent


def list_biomes(project_root: Path) -> list[str]:
    return sorted(
        p.name for p in (project_root / "assets" / "tokens").iterdir()
        if p.is_dir() and (p / "index.json").exists()
    )


def load_biome(project_root: Path, biome: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    biome_dir = project_root / "assets" / "tokens" / biome
    index = json.loads((biome_dir / "index.json").read_text(encoding="utf-8"))

    tokens = []
    for entry in index.get("tokens", []):
        # The index entry's `source` is a project-relative path to the MD;
        # the per-token compiled JSON sits alongside it with .json.
        src_rel = entry.get("source")
        if not src_rel:
            print(f"  warn: index entry {entry.get('id')} missing source, skipping", file=sys.stderr)
            continue
        spec_path = (project_root / src_rel).with_suffix(".json")
        if not spec_path.exists():
            print(f"  warn: missing {spec_path}, skipping", file=sys.stderr)
            continue
        spec = json.loads(spec_path.read_text(encoding="utf-8"))

        sketch_path = spec_path.parent / spec["sketch_file"]
        spec["_sketch_exists"] = sketch_path.exists()
        # Path to the sketch relative to the biome dir, used by the
        # HTML and markdown previews' <img src="..."> attributes.
        spec["_sketch_rel"] = (
            sketch_path.relative_to(biome_dir).as_posix()
            if spec["_sketch_exists"]
            else ""
        )
        spec["_md_rel"] = spec_path.with_suffix(".md").relative_to(biome_dir).as_posix()
        tokens.append(spec)

    return index, tokens


def render_concept_img(sketch_rel: str, w: int, h: int) -> str:
    """Return the HTML <img> tag for a token's PNG concept image.

    `sketch_rel` is a path relative to the biome dir (where the
    HTML preview is written). The biome dir is the parent of the
    category subfolder, so a path like `decorations/bush.concept.png`
    resolves correctly when the HTML is served alongside index.json.
    """
    if not sketch_rel:
        return '<div class="empty">no sketch</div>'
    return (
        f'<img class="token-img" src="{html.escape(sketch_rel)}" '
        f'width="{w}" height="{h}" alt="" loading="lazy"/>'
    )


def render_grid_overlay(footprint_w: int, footprint_h: int, display_w: int, display_h: int) -> str:
    """Render a grid overlay that marks footprint cell boundaries."""
    lines = []
    for x in range(footprint_w + 1):
        sw = 2 if x in (0, footprint_w) else 1
        lines.append(
            f'<line x1="{x * PREVIEW_TILE_PX}" y1="0" '
            f'x2="{x * PREVIEW_TILE_PX}" y2="{display_h}" '
            f'stroke="#58a6ff" stroke-width="{sw}"/>'
        )
    for y in range(footprint_h + 1):
        sw = 2 if y in (0, footprint_h) else 1
        lines.append(
            f'<line x1="0" y1="{y * PREVIEW_TILE_PX}" '
            f'x2="{display_w}" y2="{y * PREVIEW_TILE_PX}" '
            f'stroke="#58a6ff" stroke-width="{sw}"/>'
        )
    return (
        f'<svg class="grid-overlay" width="{display_w}" height="{display_h}" '
        f'viewBox="0 0 {display_w} {display_h}">{"".join(lines)}</svg>'
    )


def render_token_row(spec: dict[str, Any]) -> str:
    fw, fh = spec["footprint"]
    display_w = fw * PREVIEW_TILE_PX
    display_h = fh * PREVIEW_TILE_PX

    img_tag = render_concept_img(spec.get("_sketch_rel", ""), display_w, display_h)
    grid = render_grid_overlay(fw, fh, display_w, display_h)

    v = spec.get("visual", {})
    kind = spec.get("kind", "terrain")
    kind_class = "dynamic" if kind == "dynamic" else ""
    layers = ", ".join(spec.get("layers") or [])

    return f"""
    <tr data-category="{html.escape(spec['category'])}">
      <td class="cell-sketch">
        <div class="stage" style="width:{display_w}px;height:{display_h}px;">
          {img_tag}
          {grid}
        </div>
      </td>
      <td class="cell-id">
        <div class="id-line">
          <span class="sym">{html.escape(v.get('symbol', ''))}</span>
          <span class="id">{html.escape(spec['id'])}</span>
        </div>
      </td>
      <td class="mono">{html.escape(spec['category'])}</td>
      <td class="mono"><span class="badge {kind_class}">{html.escape(kind)}</span></td>
      <td class="mono">{fw}×{fh}</td>
      <td class="mono">{html.escape(layers)}</td>
    </tr>
    """


def render_html(biome: str, index: dict[str, Any], tokens: list[dict[str, Any]]) -> str:
    cat_index = {c: i for i, c in enumerate(CATEGORY_ORDER)}
    sorted_tokens = sorted(
        tokens,
        key=lambda b: (cat_index.get(b["category"], 99), b["id"]),
    )
    rows = "\n".join(render_token_row(b) for b in sorted_tokens)

    by_cat: dict[str, int] = {}
    for b in tokens:
        by_cat[b["category"]] = by_cat.get(b["category"], 0) + 1
    cat_summary = " · ".join(
        f"{CATEGORY_LABELS[c]} ({by_cat[c]})"
        for c in CATEGORY_ORDER if c in by_cat
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Tokens preview — {html.escape(biome)}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #0d1117;
    color: #c9d1d9;
    padding: 1.5rem;
    line-height: 1.4;
  }}
  header.top {{
    border-bottom: 1px solid #30363d;
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
  }}
  header.top h1 {{
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
  }}
  header.top .summary {{ color: #7d8590; font-size: 0.85rem; }}
  header.top nav {{ margin-top: 0.5rem; font-size: 0.8rem; }}
  header.top nav a {{ color: #58a6ff; text-decoration: none; }}
  header.top nav a:hover {{ text-decoration: underline; }}

  table.tokens {{
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    border: 1px solid #30363d;
    border-radius: 6px;
    overflow: hidden;
  }}
  table.tokens thead th {{
    background: #161b22;
    color: #7d8590;
    text-align: left;
    padding: 0.5rem 0.75rem;
    font-weight: 500;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #30363d;
    position: sticky;
    top: 0;
    z-index: 1;
  }}
  table.tokens tbody td {{
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid #21262d;
    vertical-align: middle;
  }}
  table.tokens tbody tr:last-child td {{ border-bottom: 0; }}
  table.tokens tbody tr:hover {{ background: #161b22; }}
  table.tokens td.mono {{ font-family: ui-monospace, SFMono-Regular, monospace; color: #c9d1d9; }}

  td.cell-sketch {{
    background: #0d1117 url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="10" height="10" fill="%231a2030"/><rect x="10" y="10" width="10" height="10" fill="%231a2030"/></svg>');
    width: 1px;
    white-space: nowrap;
  }}
  .stage {{
    position: relative;
    display: inline-block;
    box-shadow: 0 0 0 1px #30363d;
  }}
  .stage img.token-img {{ display: block; width: 100%; height: 100%; object-fit: fill; }}
  .stage .grid-overlay {{
    position: absolute;
    inset: 0;
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: 0.4;
  }}

  td.cell-id .id-line {{
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }}
  td.cell-id .sym {{
    color: #f0883e;
    font-size: 1.1rem;
    font-weight: 700;
    width: 1.5rem;
    text-align: center;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 3px;
    padding: 0.05rem 0;
    flex-shrink: 0;
  }}
  td.cell-id .id {{ font-weight: 600; color: #c9d1d9; }}

  .badge {{
    font-size: 0.65rem;
    color: #7d8590;
    border: 1px solid #30363d;
    border-radius: 3px;
    padding: 0.1rem 0.4rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }}
  .badge.dynamic {{ color: #d29922; border-color: #d29922; }}

  @media print {{
    body {{ background: white; color: black; }}
    table.tokens {{ border-color: #ccc; }}
    table.tokens thead th {{ background: #f5f5f5; color: #555; border-color: #ccc; }}
    table.tokens tbody td {{ border-color: #eee; }}
    .badge {{ color: #555; border-color: #aaa; }}
    td.cell-sketch {{ background: white; }}
    tr {{ break-inside: avoid; }}
  }}
</style>
</head>
<body>
<header class="top">
  <h1>📚 Tokens preview — {html.escape(biome)}</h1>
  <div class="summary">{len(tokens)} tokens · biome={html.escape(index.get('biome', biome))} · {cat_summary}</div>
</header>

<table class="tokens">
  <thead>
    <tr>
      <th>sketch</th>
      <th>id</th>
      <th>category</th>
      <th>kind</th>
      <th>footprint</th>
      <th>layers</th>
    </tr>
  </thead>
  <tbody>
    {rows}
  </tbody>
</table>
</body>
</html>
"""


def _md_escape_cell(s: str) -> str:
    """Escape a string for use in a Markdown table cell."""
    return str(s).replace("|", "\\|").replace("\n", " ").strip()


def _slug(s: str) -> str:
    return s.lower().replace(" ", "-")


def render_markdown(biome: str, index: dict[str, Any], tokens: list[dict[str, Any]]) -> str:
    """Render a Markdown reference doc for the biome.

    Output layout:
      # Tokens preview — {biome}
      ## Categories (one bullet per category, anchored)
      ## {Category}
        ### {token-id}
          ![sketch]({category-folder}/{token-id}.sketch.svg)
          | field | value | spec table
          art_notes blockquote
    """
    by_cat: dict[str, list[dict[str, Any]]] = {}
    for b in tokens:
        by_cat.setdefault(b["category"], []).append(b)

    out: list[str] = []
    out.append(f"# Tokens preview — `{biome}`\n")
    out.append(
        f"_{len(tokens)} tokens · biome=`{index.get('biome', biome)}` · "
        f"generated by `scripts/tokens_preview.py`._\n"
    )
    out.append(
        "Each token is shown with its sketch SVG, footprint, layer eligibility, and the "
        "gameplay + visual fields the painter and engine consume. See `TOKENS_SPEC.md` "
        "for the principles behind each field, `SCHEMA.md` for the file format.\n"
    )

    out.append("## Categories\n")
    out.append("| Category | Folder | Count | Tokens |")
    out.append("|---|---|---|---|")
    for cat in CATEGORY_ORDER:
        if cat not in by_cat:
            continue
        items = sorted(by_cat[cat], key=lambda b: b["id"])
        ids = ", ".join(f"[`{b['id']}`](#token-{_slug(b['id'])})" for b in items)
        out.append(
            f"| [{CATEGORY_LABELS[cat]}](#{_slug(CATEGORY_LABELS[cat])}) "
            f"| `{CATEGORY_TO_FOLDER[cat]}/` "
            f"| {len(items)} | {ids} |"
        )
    out.append("")

    for cat in CATEGORY_ORDER:
        if cat not in by_cat:
            continue
        out.append(f"## {CATEGORY_LABELS[cat]}\n")
        items = sorted(by_cat[cat], key=lambda b: b["id"])

        for spec in items:
            v = spec.get("visual", {}) or {}
            g = spec.get("gameplay", {}) or {}
            fw, fh = spec["footprint"]
            sw, sh = spec.get("sketch_size_px", [fw * TILE_PX, fh * TILE_PX])
            sketch_rel = spec.get("_sketch_rel", spec.get("sketch_file", ""))
            md_rel = spec.get("_md_rel", f"{spec['id']}.md")
            kind = spec.get("kind", "terrain")

            out.append(f'<a id="token-{_slug(spec["id"])}"></a>')
            out.append(f"### `{spec['id']}`\n")
            out.append(
                f"<sub>**symbol** `{v.get('symbol', '')}` · "
                f"**category** `{spec['category']}` · "
                f"**kind** `{kind}` · "
                f"**footprint** {fw}×{fh} · "
                f"**layers** {', '.join(f'`{l}`' for l in spec.get('layers') or [])}</sub>\n"
            )
            display_w = min(fw * 32, 720)
            out.append(f'<img src="{sketch_rel}" alt="{spec["id"]} sketch" width="{display_w}">\n')

            beats = ", ".join(g.get("beats") or []) or "—"
            fill = v.get("fill") or "—"
            out.append("| field | value |")
            out.append("|---|---|")
            out.append(f"| anchor | `{spec.get('anchor', '')}` |")
            out.append(f"| passable | `{str(g.get('passable')).lower()}` |")
            out.append(f"| damage | `{g.get('damage', 0)}` |")
            out.append(f"| beats | {_md_escape_cell(beats)} |")
            out.append(f"| fill | `{fill}` |")
            out.append(f"| material | {_md_escape_cell(v.get('material') or '—')} |")
            out.append(f"| detail_density | `{v.get('detail_density') or '—'}` |")
            out.append(f"| sketch | [`{sketch_rel}`]({sketch_rel}) ({sw}×{sh}px) |")
            out.append(f"| source | [`{md_rel}`]({md_rel}) |")
            out.append("")

            art_notes = (v.get("art_notes") or "").strip()
            if art_notes:
                out.append("**Art notes**")
                out.append("")
                for line in art_notes.splitlines():
                    out.append(f"> {line}".rstrip())
                out.append("")

    return "\n".join(out) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("biome", nargs="?", help="biome to render (default: all biomes with index.json)")
    parser.add_argument(
        "-f", "--format",
        choices=["html", "md", "both"],
        default="both",
        help="output format (default: both)",
    )
    parser.add_argument(
        "-o", "--output",
        help="output path (requires single biome + single format; "
             "default: assets/tokens/{biome}/preview.html and PREVIEW.md)",
    )
    args = parser.parse_args()

    project_root = find_project_root()

    if args.biome:
        biomes = [args.biome]
    else:
        biomes = list_biomes(project_root)
        if not biomes:
            print("no biomes found under assets/tokens/ (run scripts/tokens_compile.py first)", file=sys.stderr)
            return 1

    if args.output and (len(biomes) > 1 or args.format == "both"):
        print("--output requires a single biome and a single --format (html or md)", file=sys.stderr)
        return 2

    for biome in biomes:
        biome_dir = project_root / "assets" / "tokens" / biome
        if not (biome_dir / "index.json").exists():
            print(f"assets/tokens/{biome}/index.json not found — run scripts/tokens_compile.py {biome}", file=sys.stderr)
            return 1

        index, tokens = load_biome(project_root, biome)

        def display(p: Path) -> str:
            try:
                return str(p.relative_to(project_root))
            except ValueError:
                return str(p)

        if args.format in ("html", "both"):
            out_html = render_html(biome, index, tokens)
            out_path = (
                Path(args.output) if (args.output and args.format == "html")
                else biome_dir / "preview.html"
            )
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(out_html, encoding="utf-8")
            print(f"wrote {display(out_path)} ({len(tokens)} tokens)")

        if args.format in ("md", "both"):
            out_md = render_markdown(biome, index, tokens)
            out_path = (
                Path(args.output) if (args.output and args.format == "md")
                else biome_dir / "PREVIEW.md"
            )
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(out_md, encoding="utf-8")
            print(f"wrote {display(out_path)} ({len(tokens)} tokens)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
