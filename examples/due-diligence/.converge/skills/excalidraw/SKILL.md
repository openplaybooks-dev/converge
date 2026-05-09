---
id: excalidraw
title: Excalidraw Diagram Generation
---

# Excalidraw Diagram Generator

Generate `.excalidraw` JSON files programmatically. Each file is a standalone diagram renderable at https://excalidraw.com.

## File Schema

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [],
  "appState": { "viewBackgroundColor": "#ffffff", "gridSize": null },
  "files": {}
}
```

## Element Types

All elements share: `id` (string), `type`, `x`, `y`, `width`, `height`, `angle` (0), `strokeColor`, `backgroundColor`, `fillStyle` ("solid"|"hachure"|"cross-hatch"), `strokeWidth` (1|2|4), `strokeStyle` ("solid"|"dashed"|"dotted"), `roughness` (0=smooth|1=sketch|2=cartoon), `opacity` (0-100), `seed` (unique random int), `version`, `versionNonce`, `isDeleted` (false), `groupIds` ([]), `boundElements` ([]), `link` (null), `locked` (false).

### rectangle
`roundness`: `{"type": 3}` for rounded, `null` for sharp corners.

### ellipse
Set `width == height` for perfect circle.

### diamond
A decision node. Width ≈ height × 1.6.

### text
`text` (string), `fontSize` (12-36), `fontFamily` (1=Virgil/hand-drawn, 2=Helvetica/clean, 3=Cascadia/mono), `textAlign` ("left"|"center"|"right"), `verticalAlign` ("top"|"middle"), `containerId` (null or element id to bind text inside a shape), `originalText` (same as text), `autoResize` (true), `lineHeight` (1.25).

When text is inside a container, set `containerId` to the container's element id AND add `{"id": "<text-id>", "type": "text"}` to the container's `boundElements`.

### arrow / line
`points`: `[[0, 0], [dx, dy]]` — relative to element origin.
`startArrowhead`: `"arrow"`|`"bar"`|`"dot"`|`"triangle"`|`null`.
`endArrowhead`: same options. Use `null` for line without arrowhead.
`startBinding`: `{"elementId": "src-id", "focus": 0, "gap": 5}`.
`endBinding`: `{"elementId": "dst-id", "focus": 0, "gap": 5}`.

When binding, add `{"id": "<arrow-id>", "type": "arrow"}` to each connected shape's `boundElements`.

### frame
`name` (string). Group elements inside by setting `frameId` on child elements to the frame's id.

### freedraw
`points`: dense array of `[x, y]` relative to element origin. `pressures`: matching array of 0-1 values. `simulatePressure`: true.

## Color Palette — Semantic

| Purpose | Background | Stroke |
|---------|-----------|--------|
| Info / Input / User | `#a5d8ff` | `#1971c2` |
| Success / Output / DB | `#b2f2bb` | `#2f9e44` |
| Warning / Decision / Process | `#ffec99` | `#f08c00` |
| Error / Danger / Critical | `#ffc9c9` | `#e03131` |
| External / Storage / Special | `#d0bfff` | `#9c36b5` |
| Neutral / Disabled / Note | `#e9ecef` | `#495057` |

## Typography

| Level | fontSize | fontFamily | fontWeight (approx) |
|-------|----------|------------|---------------------|
| Title | 28-36 | 2 (Helvetica) | bold style |
| Section header | 24 | 2 | — |
| Box label | 20 | 2 | — |
| Description | 16 | 2 | — |
| Note / fine print | 14 | 2 | — |

## Layout Conventions

- **Grid**: multiples of 50px for spacing. Standard shape: 120×80 min, 160×100 large, 200×120 xl.
- **Flow direction**: top-to-bottom for processes, left-to-right for timelines, center-out for mind maps.
- **Arrow gap**: 5px from shape edge. `focus`: 0 = center of edge, -1 to 1 for offset.
- **Section separation**: 80-120px between sections. Canvas: 1200×800 minimum for complex diagrams.
- **Grouping**: use matching `groupIds` to keep related elements together. Frames for section boundaries.

## Arrow Conventions

| Meaning | Style |
|---------|-------|
| Data flow / synchronous | Solid, filled arrowhead |
| Return / response | Dashed, open arrowhead |
| Dependency / "uses" | Dotted, open arrowhead |
| Inheritance / "is-a" | Solid, triangle arrowhead (bar) |
| Bidirectional | Arrowhead on both ends |

## Unique Seeds

Every element needs a unique `seed` integer for deterministic hand-drawn rendering. Use sequential numbers starting from 1000.

## Element ID Convention

Use semantic prefixes: `rect-`, `ellipse-`, `diamond-`, `text-`, `arrow-`, `frame-`, `line-`, `freedraw-`.
