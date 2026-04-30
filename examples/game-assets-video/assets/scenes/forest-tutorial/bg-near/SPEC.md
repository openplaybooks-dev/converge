# bg-near scenery spec — `forest-tutorial`

> This document is the **design brief for the bg-near painter** (human or AI).
> It describes the painted foreground-edge scenery only — the ground band and
> the decorative props that live on top of it. **It does NOT describe the
> tilemap, platforms, hazards, interactive items, or characters.** Those
> belong to `03-tiles`, `04-props`, and `03-characters` and will be composited
> on top of bg-near at runtime.
>
> The next deliverable from this spec is `bg-near/scene-skeleton.svg` — a
> single wide SVG (3904×960) showing the layout and shapes of every scenery
> element. The SVG is the visual concept; the painted PNG is the final asset.

## 1. Overall mood

A bright, cheerful, **early-game forest tutorial**. Sunny, mid-morning lighting.
Verdant. Inviting — a place a brand-new player feels safe in. The eye should
read "fantasy forest" instantly. Style is hand-painted 2D platformer (think
Hollow Knight × Ori × early Rayman), not realistic.

The scene scrolls left-to-right (244 tiles wide × 60 tall × 16 px = 3904×960
px canvas). The painter is responsible only for the foreground EDGE — the
band along the bottom roughly 50–55 % of the canvas. Everything above the
ground polyline stays pure chroma green (`#00FF00`) so the bg-mid silhouette
band and bg-far back wall composite through.

## 2. Palette (canonical, used scene-wide)

| Role            | Hex        | Where it goes                                                       |
|-----------------|-----------|----------------------------------------------------------------------|
| `ground_fill`   | `#6FAA3E` | The ground polygon's main body — vibrant grass-green                |
| `ground_stroke` | `#3A5C24` | Dark line along the top edge of the ground polyline                 |
| `foliage_fill`  | `#2E5530` | Deep forest-green — grass tufts, leaves, fronds                     |
| `foliage_stroke`| `#1A3A1C` | Dark outline on foliage / mid-tone in shadowed sides                |
| `wood`          | `#5B3B1C` | Tree-stumps, fallen logs, exposed roots                             |
| `rock`          | `#7A6F5A` | Stones, pebbles, dirt clods (warm-grey)                             |
| `accent_flower` | `#E8C547` | Yellow / wildflower highlight (used SPARINGLY)                      |
| `chroma`        | `#00FF00` | Negative space above the ground band (no other content there)      |

The painter must stay within these eight values for the bg-near layer. Mid
tones can be shaded between them, but no new hues introduced.

## 3. Ground polyline (the binding geometry)

The top edge of the painted ground band follows the playable elevation curve
committed in `stage.json[elevation]`. There are 17 elevation samples spanning
x_tile 0 → 244. The painter must NOT redraw the curve — it's mechanical.

| x_tile | y_tile | canvas (x_px, y_px @ amplitude 32 px/tile, baseline 480) |
|--------|--------|-------------------------------------------------|
|   0    |  14    | (   0, 480)                                     |
|  15    |  14    | ( 240, 480)                                     |
|  30    |  16    | ( 480, 544)                                     |
|  45    |  15    | ( 720, 512)                                     |
|  60    |  13    | ( 960, 448)                                     |
|  75    |  14    | (1200, 480)                                     |
|  90    |  14    | (1440, 480)                                     |
| 105    |  16    | (1680, 544)                                     |
| 120    |  18    | (1920, 608)                                     |
| 135    |  16    | (2160, 544)                                     |
| 150    |  15    | (2400, 512)                                     |
| 165    |  17    | (2640, 576)                                     |
| 180    |  15    | (2880, 512)                                     |
| 195    |  14    | (3120, 480)                                     |
| 210    |  13    | (3360, 448)                                     |
| 225    |  14    | (3600, 480)                                     |
| 244    |  14    | (3904, 480)                                     |

Top edge = these points connected with straight segments (or smooth catmull
splines if the painter prefers — but every sample point must be touched).
Bottom edge = canvas bottom (y=960). Left/right edges close the polygon.

## 4. Per-chunk scenery plan

The scene splits into 8 beat-driven sections (chunks). Each chunk has its own
biome character. The painter populates each chunk's foreground band with the
listed prop kinds. Densities are guidelines, not contracts.

### Chunk 0 — `player-start → first-small-rise` (x_tile 0–30, x_px 0–480)

- **Biome:** grassland-open. Calm, inviting. This is the player's first frame
  — read "you start here, you're safe".
- **Ground material:** grass with light dirt patches near the slope at x=30.
- **Decoration (4–5 props):** 2–3 grass tufts (`grass-tuft`, 60–80 px tall),
  1 small rock (`rock`, 80×56 px), 1 cluster of yellow wildflowers
  (`flowers`, 40×40 px). Spread across the chunk; cluster slightly near the
  player spawn at x≈32 px.
- **Notes:** No foliage taller than 80 px in this chunk — keep the eye-line
  open so the player sees what's coming.

### Chunk 1 — `first-small-rise → health-potion-learn` (x_tile 30–50, x_px 480–800)

- **Biome:** grassland-path. The ground transitions from grass to a packed
  dirt path; show the seam at ~x_tile=30 (x=480 px).
- **Ground material:** dirt with grass edges fraying inward.
- **Decoration (4 props):** 1 mossy stone (`mossy-stone`, 64×48 px) near the
  path edge, 2 grass tufts framing the path, 1 dirt clod (`dirt-clod`,
  64×32 px) showing wear from foot traffic.
- **Notes:** The first health potion sits in this chunk at x_tile=50
  (gameplay layer); leave a visually empty patch around (x=720–800 px,
  y=464–540 px) so the potion sprite reads clearly.

### Chunk 2 — `health-potion-learn → water-pit-crossing` (x_tile 50–80, x_px 800–1280)

- **Biome:** grassland-wetland. Ground gets darker, mossier as it approaches
  the water pit.
- **Ground material:** dirt → mossy mud near x=1200 (the hazard).
- **Decoration (5 props):** 2 reeds (`reeds`, 48×80 px tall), 1 cattail
  (`cattail`, 40×72 px), 1 lily-pad (`lily-pad`, 56×32 px) near x=1200,
  1 mossy stone (`mossy-stone`, 64×48 px).
- **Notes:** The water pit hazard is at x_tile=75 (x=1200) — leave a clear
  band there (x=1152–1248 px, y=512–560 px) for the water tiles to sit. Keep
  decoration AROUND the water, not over it.

### Chunk 3 — `water-pit-crossing → first-jump-challenge` (x_tile 80–110, x_px 1280–1760)

- **Biome:** grassland-elevated. Ground rises into a small ledge at x=110
  (lowest elevation y=18 in the scene, at x=120).
- **Ground material:** grass with rocky outcrop near the rise.
- **Decoration (5–6 props):** 2 rocks (`rock`, 80–96×56–64 px) showing the
  geology of the rise, 1 grass tuft (large, 88×72 px), 1 moss patch
  (`moss-patch`, 80×32 px), 1 small tree-stump (`tree-stump`, 96×96 px) at
  the back of the rise.
- **Notes:** First jump platform sits at x_tile=108–112 (x=1728–1792, y=18,
  at canvas y≈608); leave a visually clear top edge there.

### Chunk 4 — `first-jump-challenge → optional-ledge-access` (x_tile 110–150, x_px 1760–2400)

- **Biome:** grassland-path. Path winds through a wider grassland area.
- **Ground material:** alternating grass and dirt patches.
- **Decoration (6 props):** 3 grass tufts of varying size (60–88 px),
  1 yellow flowers cluster (48×48 px), 1 medium rock (96×64 px),
  1 dirt-clod near the path corner at x_tile=130 (x=2080).
- **Notes:** This is the longest "rest" chunk — most decoration, most
  scenery interest. Use it to give the player a breather visually.

### Chunk 5 — `optional-ledge-access → key-pickup` (x_tile 150–160, x_px 2400–2560)

- **Biome:** grassland-elevated (optional ledge). Tight chunk — only 160 px
  wide (the optional jump access).
- **Ground material:** grass with stone outcrop on the ledge.
- **Decoration (3 props):** 1 large tree-stump (`tree-stump`, 128×112 px) at
  the back, 1 grass tuft, 1 yellow flowers cluster (rewarding the player for
  the optional jump).
- **Notes:** The optional ledge platform footprint is at x_tile=155–165
  (overlaps into chunk 6); paint the ground supporting it but leave the top
  edge clean.

### Chunk 6 — `key-pickup → final-descent` (x_tile 160–200, x_px 2560–3200)

- **Biome:** grassland-elevated → grassland-open transition. Ground gradually
  descends back to spawn-level elevation.
- **Ground material:** grass with occasional flower patches (richer than
  earlier chunks — this is the "treasure room" feel since the gold-key
  pickup is at x_tile=160).
- **Decoration (6 props):** 2 grass tufts, 2 yellow flowers clusters
  (rewarding visual after the key pickup), 1 medium rock, 1 mossy stone, 1
  small tree-stump near the back.
- **Notes:** Gold-key gameplay pickup at x_tile=160, y=23 (gameplay layer);
  leave a small clean visual zone around (x=2528–2592 px, y=448–512 px).

### Chunk 7 — `final-descent → scene-exit` (x_tile 200–244, x_px 3200–3904)

- **Biome:** grassland-exit. Final stretch leading to the level boundary.
  Slightly more wild — taller foliage hinting at the deeper forest beyond.
- **Ground material:** grass throughout.
- **Decoration (5–7 props):** 2 large tree-stumps (`tree-stump`, 128×112 px)
  near the right edge framing the exit, 2 grass tufts, 2 yellow flowers
  clusters, 1 berries cluster (`berries`, 40×40 px) for character.
- **Notes:** The right edge (last 200 px, x=3700–3904) should feel like a
  natural visual boundary — the scene "wants" to be left here. Cluster
  vertical foliage there.

## 5. Cross-chunk continuity

- Same canonical palette (Section 2) used throughout — no per-chunk variation.
- Ground material transitions happen IN the chunks not at boundaries, so the
  seams between chunks are visually invisible.
- Foliage density gradually increases from chunks 0 → 7 — the further into
  the level the player gets, the wilder the forest feels.
- Lighting is uniform mid-morning sun from upper-left; all foliage
  highlights are on the upper-left, shadows on the lower-right.

## 6. What's NOT in bg-near (do not paint)

| Element | Owned by |
|---|---|
| Walkable grass / dirt / water tiles | `03-tiles` (tilemap) |
| Platforms (the elevated/ledge surfaces players jump on) | `03-tiles` (tilemap) |
| Water hazards as gameplay objects | `03-tiles` (water tiles) |
| Health-potion sprite (interactive) | `04-props` (spritesheet) |
| Gold-key sprite (interactive) | `04-props` (spritesheet) |
| Hero-knight character | `03-characters` (spritesheet) |
| Sky / clouds / distant horizon | `bg-far` (separate layer) |
| Mid-distance silhouettes | `bg-mid` (separate layer) |

The bg-near layer paints AROUND these things and leaves visual room for them.
Where this spec says "leave room", the painter must keep that x/y region clean
of dense foliage so the gameplay element on top reads clearly.

## 7. Acceptance criteria for the painted asset

The painted `bg-near/final.png` (3904×960 RGBA) is acceptable when:

1. The ground polyline matches Section 3 exactly (top edge = elevation curve).
2. Top 50 % of the canvas is pure `#00FF00` chroma — no foliage above the
   ground polyline except where Section 4 explicitly allows tall stumps.
3. Each chunk has at least the specified prop count and kinds; sizes within
   ±20 % of the listed dimensions.
4. Palette is exactly the eight hex values from Section 2 — verified by
   sampling: ≥ 95 % of non-chroma pixels match one of the canonical colors
   (small mid-tone variation tolerated).
5. The "leave room" zones in Section 4 are visually empty (no prop occupies
   those rectangles).
6. The result reads as ONE coherent forest scene end-to-end — no chunk
   boundary visible.
