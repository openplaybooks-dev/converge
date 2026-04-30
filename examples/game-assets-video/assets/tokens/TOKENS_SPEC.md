# Tokens Spec — Principles for Authoring Design Tokens

This is the **why** of the tokens library. For the **what** (file format,
required fields, validation rules), see `SCHEMA.md` next door.

The tokens library is a per-game vocabulary of named **design tokens** —
reusable visual + gameplay primitives. Building a game means defining a
token set, then mapping tokens into scenes. Image generation paints over
the token assembly to produce the final visuals. This doc explains how
to think about that vocabulary so the tokens you author are useful,
composable, and consistent.

The audience is whoever authors tokens — humans curating a library or
LLMs producing one from a brief. If you're writing a token and this
spec doesn't tell you what to do, the spec is wrong. Update it.

---

## Lookup guide — where each kind of token lives

Tokens are organised on disk by **category**. Each per-biome folder is
split into six category subfolders, mirroring the six categories below:

```
assets/tokens/{biome}/
├── ground/         # walkable surfaces (always block movement)
├── platforms/      # floating jumpable surfaces
├── hazards/        # damage-on-contact surfaces (water, lava, thorns)
├── decorations/    # visual-only on play / fg layers
├── background/     # parallax bg-far / bg-mid silhouettes
└── markers/        # 1×1 gameplay-event points (spawn, exit, pickup)
```

When you need to find or update a token: open the category folder, scan
the file list. When you author a new token: place it in the folder that
matches its `category` field. The compiler enforces that the folder
name matches the category — drift is rejected at compile time.

---

## 1. What a token is, and what it isn't

A token is a **named, reusable visual element with a fixed grid
footprint**. It carries three things together: a body (size + anchor),
a concept image (a painted PNG showing what it looks like in the project's style), and visual
attributes (color, material, layer eligibility, gameplay semantics,
art notes). Together those make a token the **atom of scene
composition**.

Tokens are not:

- **Sprites.** Sprites are character/object animations stamped onto a
  scene by the engine at runtime. Tokens are static parts of the
  scene's visual layout. The hero-knight is a sprite. The platform he
  jumps onto is a token.

- **Tiles.** Tiles are 16×16 pixel pieces that tile seamlessly to make
  a textured surface. A token may *imply* a tile pattern (e.g. a
  "ground-10w" token covers ten tiles of grass+dirt), but it's
  authored as a single named footprint, not as a per-tile mapping.
  The tile texture is the painter's job, not the token author's.

- **Props.** Props are interactive items the player can pick up
  (potions, keys) or interact with (chests, levers). Tokens declare
  *where* a prop goes via a `marker` token (e.g. `pickup-key`), but
  the prop's sprite and animation are separate assets.

- **Hand-painted scenery.** A token is a generic, reusable unit. If
  you find yourself authoring a token that only makes sense for one
  scene, you're not writing a token — you're writing a one-off, and a
  one-off doesn't belong in the tokens library.

The test for "is this a token?" is **reuse across scenes**. If three
scenes in the biome plausibly use this thing, it's a token. If only
one does, it's a prop or a one-off.

---

## 2. The six categories

Every token declares a `category`. The category is not just a label —
it tells the painter what kind of thing the token is, and tells the
composer what role the token plays in a scene. The category also
determines which subfolder the token file lives in (see Lookup guide).

| Category | Folder | What it is | Examples |
|---|---|---|---|
| `ground` | `ground/` | The surface the player walks on. Always blocks player movement. | `ground`, `ground-3w`, `ground-10w`, `ground-bumpy` |
| `hazard` | `hazards/` | A surface that damages the player on contact (water, lava, thorns, spikes). May or may not be passable. | `pond`, `pond-3w`, `thorn-patch` |
| `platform` | `platforms/` | A floating, jumpable surface above the main ground line. Often one-way (player can jump up through the bottom). | `platform-wood`, `platform-wood-3w`, `platform-wood-7w` |
| `decoration` | `decorations/` | Visual richness on the play layer (small props, foliage, rocks). Always passable, never damaging. | `rock`, `flower-patch`, `bush`, `branch-frame` |
| `background` | `background/` | Visual elements on the bg-far / bg-mid layers. Distance silhouettes, mountains, distant tree bands. Never gameplay. | `mountain-distant`, `mountain-small`, `tree-band-far`, `tree-cluster-mid`, `tree-cluster-near` |
| `marker` | `markers/` | Gameplay-only points (1×1 footprint). Invisible at runtime; drives engine events. | `spawn`, `exit`, `pickup-key`, `pickup-potion` |

### Picking the right category

Use this decision tree when authoring a new token:

1. **Does it block player movement?** If yes → `ground` or `platform`.
   - If it's the main floor → `ground`.
   - If it floats above the floor and the player jumps onto it → `platform`.
2. **Does it damage the player on contact?** → `hazard` (regardless of passability).
3. **Is it a 1×1 gameplay event point (spawn/exit/pickup)?** → `marker`.
4. **Is it on the play layer but doesn't affect gameplay?** → `decoration`.
5. **Is it on a background layer (bg-far, bg-mid, fg)?** → `background`.

The categories are mutually exclusive. A token is one category.

### Why decorate-on-play and background are separate

Both are visual-only. They differ in *which layer they paint on*:

- `decoration` lives on the **play layer** alongside ground/platforms/hazards. It's foreground detail that scrolls at camera speed (parallax depth = 1.0). Examples: a rock sitting on the grass, a flower patch.
- `background` lives on **bg-far or bg-mid** (parallax depth < 1.0) and scrolls slower. Examples: distant mountains, mid-distance tree clusters.

A `branch-frame` token (foreground frame above the play layer) is also `decoration` — same category, different layer (`fg` instead of `play`).

---

## 3. Footprint sizing — when to fork a width-variant

Tokens have integer footprints in concept-tile units. A `ground` token is 5 wide × 1 tall; a `pond` is 6 wide × 2 tall; a `mountain-distant` is 15 wide × 6 tall.

**The hard question:** when you need a wider variant of an existing token, do you fork (`ground-10w`, `ground-15w`) or parametrize (a single `ground` with a runtime `width` field)?

The answer is **fork**. Reason: every token has a sketch, and the sketch is hand-authored at a specific footprint. Stretching one sketch to fit a different footprint distorts shapes — a 5×1 grass band scaled to 30×1 produces 6× wider blades, which the painter then locks in. Forking means each variant has its own correct sketch.

But fork *carefully*. Heuristic:

- Fork when the visual changes meaningfully at different sizes. A 3-tile tree is one tree; a 9-tile cluster is three trees with overlapping canopies. Different sketches.
- Don't fork when only the width changes uniformly. `ground-3w`, `ground-5w`, `ground-10w` are all "grass blade row + dirt body, repeated." Three forks here is acceptable because they cover the common composition lengths (short fillers, medium runs, long stretches), but going further (every width 1 through 30) is overkill — pick a small set of useful widths.

Rough rule: 3–4 width variants per category is enough. Fewer is fine. Anything more, and you're spamming the tokens library.

### Anchors

Tokens declare an `anchor` that says which corner of the footprint the `at` coordinate refers to. Three anchors are supported:

- `bottom-left` (default, used by ~all tokens) — the token's bottom-left cell sits at `(at.x, at.y)`. Natural for ground-resting tokens (ground sits on the world floor, platforms float above; in both cases the token's bottom is the visual base).
- `top-left` — used for tokens that hang from above. `branch-frame` is anchored top-left because the branch enters the canvas from the top edge of the camera.
- `center` — rare; for radially-symmetric tokens where the meaningful position is the center of mass. Not currently used in grassland.

When in doubt, use `bottom-left`. Only change to `top-left` for tokens that conceptually "hang" rather than "rest."

---

## 4. Layer eligibility

Each token declares `layers: [...]` listing which layers it can be placed in. Available layers (defined by the scene assembly, not the token) are:

- `bg-far` (depth ~0.1) — atmosphere, distant mountains, sky decor.
- `bg-mid` (depth ~0.4) — silhouettes, mid-distance trees, blurred forms.
- `play` (depth 1.0, always) — gameplay surface; ground, water, platforms, hazards, decoration, markers.
- `fg` (depth >1.0) — foreground frames; vines, branches, blurred grass that the camera looks past.

### Layer eligibility rules

- `ground`, `hazard`, `platform`, `marker` tokens → **only `play`**. These have gameplay meaning; they cannot live in background layers (which never scroll at camera speed and aren't collision-relevant).
- `decoration` → **`play` or `fg`**. A rock sits on the grass (`play`). A foreground branch hangs in front of the camera (`fg`). Same category, different layer per token.
- `background` → **`bg-far` or `bg-mid` (or both)**. A `tree-cluster-mid` is mid-distance; a `mountain-distant` is far-distance. Some tokens (e.g. `tree-cluster-near`) are eligible for both `bg-mid` and `fg` because they read as either depending on the scene's parallax setup.

Multi-layer eligibility (a token listed in two layers) is fine and useful. The composer or AI picks which layer to place it in per scene. Example: `bush` is eligible for `play` AND `bg-mid`. Place it on `play` for foreground bushes the player walks past; place it on `bg-mid` for silhouetted bushes on the mid horizon.

### Why depth lives in the assembly, not the token

A token doesn't know its parallax depth — that's a property of the scene's layer setup. The same token can sit at depth 0.4 in one scene and depth 0.6 in another (different parallax intensities). The token is the *what*; the scene is the *where and how-fast*.

---

## 5. The concept image contract

Every token lives in its own folder named after its id, inside the
appropriate category subfolder. The folder is fully self-contained and
holds five files:

- `token.md` — the authored spec (this file's frontmatter)
- `token.json` — the compiled spec (generated)
- `concept.png` — the painted concept image (generated)
- `prompt.txt`, `seed.txt` — the AI prompt and seed used for the concept

The concept image is what the **stamper** drops into per-layer visual maps and what the scene **painter** then refines during image-edit.

The concept is **painted in the project's target style**. It's not a finished sprite (the scene painter still composes and refines it into final art), but unlike the older SVG sketch, it doesn't fight the painter's style — it shows the token already in the visual language the rest of the scene will speak.

Concept images are generated by `scripts/generate_token_concepts.py` from each token's frontmatter (id, footprint, visual.fill, visual.material, visual.art_notes) plus the biome's landscape concept and the project's style anchors. You author the MD; the generator produces the PNG.

### What's in scope

- **Right shape.** The concept fills the canvas with the token's natural silhouette — a tree cluster reads as overlapping painted canopies, a pond reads as wider-than-tall water with painted shore edges, a mountain reads as a triangular painted silhouette.
- **Right palette.** The generator's prompt pulls from `visual.fill`, `visual.material`, and the project ART_BIBLE — concepts honor the project palette by construction.
- **Right aspect.** `sketch.size_px` matches the footprint aspect ratio. A 6×2 pond concept is wide-and-short (1024×341); a 1×1 marker is square (1024×1024). The compiler enforces this within 5%.
- **Transparent background.** The concept's silhouette occupies the canvas; surrounding pixels are alpha=0. The stamper relies on this for layer composition.
- **Painted finish.** Visible brushwork, atmospheric shading, palette mixing — the qualities the scene painter expects to see in its input.

### What's out of scope

- **No characters.** No player, NPCs, enemies. Tokens are environment primitives.
- **No UI/text/captions.** No labels, frame numbers, watermarks, debug overlays.
- **No multi-cell layouts.** One concept image, one token. Width-variant tokens have their own MDs and their own concepts.
- **No scene composition.** The concept shows the token alone, not in a scene with neighbors. Composition happens at scene-stamp time.

### Why painted, not vector

The earlier version of the spec used hand-authored SVG sketches that the stamper rasterized into per-layer maps. That worked structurally but produced a flat-vector starting point that fought the painterly target — the scene painter spent its budget overcoming the sketch's style instead of refining it. Painting concepts under constraint (style anchors + token spec) gives the painter content already in the right visual language, so its job becomes composition and refinement, not style transfer.

If you need a stylistic refresh of all concepts (e.g. when ART_BIBLE.md changes), re-run `python scripts/generate_token_concepts.py --force`.

---

## 6. Gameplay vs visual responsibilities

Every token declares `gameplay` (passable, damage, beats) and `visual` (fill, material, art_notes). These two blocks express the token's two roles:

- **Visual:** what the token looks like and how the painter should paint it.
- **Gameplay:** what the token does in the engine's collision and event systems.

These two roles are independent. A token with `passable: false` and `damage: 0` is solid (ground, platform). A token with `passable: false` and `damage: 1` is a deadly solid (a wall of spikes). A token with `passable: true` and `damage: 1` is a step-on hazard (fire, thorns). A token with `passable: true` and `damage: 0` is decoration or a background element.

### Why the token declares gameplay even though terrain is derived

The terrain map (collision grid + hazard regions) is derived by walking the scene's play-layer token instances and projecting each token's `gameplay` onto the gameplay grid. The token is the source of truth; the terrain is a projection.

This means: when you change a token's `gameplay.passable` from `true` to `false`, every scene using that token automatically picks up the change in its derived terrain. You don't update scene files. You update the token once.

The same goes for `damage` and `beats`. If you decide thorn-patches should now do 3 damage instead of 1, edit `thorn-patch.md` and re-derive terrains. Scenes don't change.

### Beats: gameplay events at a token's anchor

`gameplay.beats` lists event tags emitted at the token's anchor cell. Standard beats:

- `spawn` — player starts here. Exactly one per scene; on a `spawn` token.
- `exit` — level transition; player walks here to finish the scene.
- `pickup` — the engine spawns a pickup sprite at this cell (the specific sprite is named by the token id, e.g. `pickup-key` → spawn a key). Multiple per scene.
- `hazard` — informational, used by the analytics layer to count damaging encounters per scene. Non-marker hazard tokens emit this beat too (e.g. a `pond` emits `hazard` so the engine logs "player crossed water at x_tile=30").
- `platform-up` — informational, on platform tokens. Helps the engine identify pacing checkpoints.

Beats are NOT collision; they're event triggers. The engine handles them at runtime.

---

## 7. Biomes — when to fork

The tokens library is biome-scoped: `assets/tokens/grassland/`, `tokens/cave/`, `tokens/desert/`, etc. The same logical token (e.g. "ground") looks different in different biomes (grass on top vs. cave-rock on top vs. sand). Each biome has its own MD + sketch even when the gameplay contract is identical.

### What's biome-specific

- **Concept image.** The cave biome's `ground/concept.png` shows rock + lichen, not grass + dirt. The grassland's `pond/concept.png` shows lily pads; the cave's might show murky water with stalagmites. The generator picks up the biome's landscape concept as a reference, so concepts come out biome-flavoured automatically.
- **Visual fill / material / art_notes.** Different palette per biome (see ART_BIBLE).
- **Some tokens are biome-only.** A grassland tokens library has `tree-cluster-mid`. A cave tokens library has no trees but adds `stalagmite`, `lichen-patch`, `crystal-cluster`. A desert tokens library adds `cactus`, `sand-dune`, `oasis`.

### What's biome-portable

- **Gameplay contract.** A pond is a pond — `passable: false, damage: 1` — regardless of biome. Don't change the gameplay block when forking biomes.
- **Footprint.** A `ground` token is 5×1 in grassland; keep it 5×1 in cave. Players' jump physics shouldn't change because the biome did.
- **Categories.** A pond is `category: hazard` everywhere.
- **Layer eligibility.** A ground token is `layers: [play]` everywhere.

So forking a token to a new biome means: copy the MD, change the sketch + fill + material + art_notes; leave gameplay/footprint/category/layers alone. The structure of the library is biome-portable; the surface details aren't.

### When a biome adds genuinely new tokens

Some tokens have no analog in other biomes — `crystal-cluster` doesn't exist in grassland. That's fine; biomes can carry their own token types. The constraint is: if the token has a structural analog (a hazard, a platform, a piece of ground), match the structural fields to the analog's grassland version.

---

## 8. Symbol design

Every token declares `visual.symbol`: a single ASCII character that
represents the token on per-layer mapping grids
(`mappings/{layer}.md`). The symbol is what authors and AI write when
drawing scenes; the compiler reverse-looks-up `(layer, symbol) →
token_id` to recover instances.

### Constraints

- **Single character.** Multi-char patterns rejected.
- **Layer-scoped uniqueness.** Two tokens eligible for the same layer
  cannot share a symbol. Two tokens on different layers may share a
  symbol — `b` is `bush` on both `play` and `bg-mid`, and that's fine
  because the grids are read independently.
- **Reserved.** `.` is empty cell. Whitespace (space, tab) is parser
  whitespace. Backtick (`` ` ``) breaks the fenced-block format.
  Other punctuation, ASCII letters, and digits are fair game.

### Picking heuristics

Pick the symbol so the grid is readable to humans:

- **Mnemonic alignment.** Use the token's first letter or a
  visually-iconic char. `T` for tree, `M` for mountain, `~` for water,
  `=` for platform.
- **Case for size variants.** If you have several width variants of
  the same token concept, use uppercase for the largest, lowercase
  for smaller, or pair related glyphs (`#` for medium ground, `g` for
  short, `G` for long). Authors reading the grid see "more grass" at
  a glance.
- **Visual weight matches gameplay weight.** Solid cells use heavy
  glyphs (`#`, `G`, `B`); transparent/decoration cells use lighter
  ones (`r`, `f`, `b`); hazards stand out (`^`, `W`).
- **Don't reuse glyphs across layers casually.** Sharing is allowed
  but confusing. If `T` is "tree" on bg-mid, don't use `T` for
  "thorn" on play — pick `^` or `H` instead.

### When two tokens fight for the same symbol

If `pond` and `puddle` both want `~`, you have three options:

1. Pick a different symbol for one (`pond` → `W`, `puddle` → `~`).
2. Merge them into one token with width variants (`pond-3w`,
   `pond-6w`, etc.) — same symbol family, different footprints.
3. If they're functionally identical (same gameplay), drop one.

Same-symbol same-layer is a compile error. Fix at the token level,
not by working around it in the scene.

---

## 9. Static (terrain) vs dynamic tokens

Every token declares `kind: terrain` (default) or `kind: dynamic`.
This is a binary classification of *how the token lives at runtime*,
distinct from `category` (which is about the token's gameplay role).

### Terrain tokens

- **Static.** Position fixed at level-load time.
- **Painted into the level once.** The painter renders them as part
  of the scene's layer images; the engine never re-renders them
  per-frame.
- **Authored on a grid.** Terrain tokens live in `mappings/<sub-layer>.md`
  files with a ` ```map ` ASCII grid block. Each cell shows the token's
  symbol; multi-cell footprints paint as rectangular regions.
- **Examples**: `ground`, `pond`, `platform-wood`, `rock`,
  `flower-patch`, `bush`, `thorn-patch`, `tree-cluster-mid`,
  `mountain-distant`, `branch-frame`. Anything that's drawn into the
  scene and stays put.

### Dynamic tokens

- **Engine-driven.** The token's `at` coord is the *initial spawn
  position*; runtime motion, animation, or trigger logic is the
  engine's job.
- **Sprite, not paint.** Dynamic tokens are placeholders for engine
  sprites. The painter doesn't render them into the scene image; the
  engine spawns animated sprites at runtime at the declared coords.
- **Authored as point coordinates** in a `# props` YAML block inside a
  `mappings/<sub-layer>.md` file. **No ` ```map ` grid block.**
- **Examples**: `spawn`, `exit`, `pickup-key`, `pickup-potion`,
  moving platforms, enemies, switches, projectiles.

### Why this split exists

A static rock and a moving platform both have collision and both have
visuals. The difference is whether the engine needs to *update* them
per frame:

- A rock at `(8, 11)` is painted at level-load. The collision shape is
  derived once from the token's footprint at its grid cell. Engine
  cost per frame: zero.
- A moving platform at initial position `(50, 8)` is sprite-driven.
  Engine animates the sprite, updates collision per frame, and the
  painter never sees this token — it's not part of the painted level.

Putting these on the same authoring grid would mean: the painter
paints the platform at its initial position, which is wrong because
the platform moves. The collision system tracks the painted position,
which is wrong because the platform moves. Splitting them by `kind`
makes both consumers (painter, engine) read only the tokens relevant
to their concern.

### Decision rule

When authoring a new token, ask:

1. Does this token's position or visual change at runtime? If yes →
   `kind: dynamic`.
2. Is the token a placeholder for a sprite the engine spawns/animates?
   If yes → `kind: dynamic`.
3. Otherwise → `kind: terrain`.

A passable damaging hazard like `thorn-patch` is `kind: terrain`: it
sits at a fixed position, the painter paints it, the engine reads its
collision-and-damage from the grid. It doesn't animate or move.

A pickup like `pickup-key` is `kind: dynamic`: the engine spawns an
animated key sprite at the spawn position, and when collected the
sprite disappears. The painter never renders the key into the scene
image.

---

## 10. Cross-references

- **`SCHEMA.md`** — the file format reference. What fields a token MD must have, what enums are valid, what the compiler validates. Read this when you're confused about how to *write* a token file.
- **`ASSEMBLY.md`** — the scene assembly format. How to compose tokens into a scene; per-layer placements; coordinate conventions. Read when you're authoring a `visual_mapping.md` or `scene.assembly.json`.
- **`grassland/{category}/*.md`** — concrete examples of well-shaped tokens, organised by category. Read these alongside this spec to see principles applied. Aim to match their voice and structure.
- **`MODERN_SIDE_SCROLL_SPEC.md` (project root)** — the larger pipeline spec. Where tokens fit in the broader idea→tokens→assembly→stamp→paint→composite chain.

---

## 11. Authoring checklist

Before you commit a new token:

- [ ] `id` is unique within the biome and kebab-case.
- [ ] `category` is one of the six. You picked it deliberately, not by default.
- [ ] The token file lives under `tokens/{biome}/{category-folder}/` matching its `category`.
- [ ] `kind` is `terrain` (default) or `dynamic`. Use the §9 decision rule. Don't omit if dynamic.
- [ ] `body.footprint` is integer cells, sensible for the token's role (ground 1 tall; trees 3–6 tall; mountains 4–8 tall; markers 1×1).
- [ ] `layers` lists only layers the token is genuinely useful in. Don't include `fg` "just in case."
- [ ] `gameplay.passable / damage / beats` are filled even for visual-only tokens (set passable=true, damage=0, beats=[] for decoration).
- [ ] `visual.symbol` is one character, mnemonic for the token, and unique among tokens eligible for the same layer(s).
- [ ] `visual.fill` is in the project's ART_BIBLE palette.
- [ ] `visual.art_notes` describes what the painter should paint, not what the sketch shows. Aim for 2–3 sentences of guidance.
- [ ] `sketch.file` is `concept.png` (sibling to `token.md` in the per-asset folder).
- [ ] `sketch.size_px` aspect equals `footprint` aspect; long side = 1024.
- [ ] After `scripts/generate_token_concepts.py {biome}` runs, the
      `concept.png` exists in the same folder as `token.md`, opens cleanly, and is RGBA.
- [ ] `python scripts/tokens_compile.py {biome}` runs clean.
- [ ] You can imagine three different scenes in the biome that would use this token. (If not, it's a one-off.)

If you can check every box, the token is ready to ship.
