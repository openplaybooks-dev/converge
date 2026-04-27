// Palette + style constants — the locked visual identity.
//
// Three "core" colors (PRIMARY/SECONDARY/ACCENT) — these dominate every
// asset, used by `c.material(name, { color: 'primary' })`.
//
// Plus a NAMED palette of additional colors lifted from
// interactive-low-poly-environment (Roberto Nacu, MIT). These are the
// "wood, brick, roof, water, grass, fire" hues you reach for when you need
// a specific natural-world color that isn't one of the core three. Type-
// gated via the `PaletteName` union — using anything else is a compile error.

// ── Core three (locked, dominate the look) ──────────────────────────────
export const PRIMARY = 0xa89890;   // mid grey-brown — bodies, hulls, walls
export const SECONDARY = 0x4a4a52; // charcoal — joints, hardware, shadow
export const ACCENT = 0xf0a050;    // warm amber — emissive ONLY (lens, screen, stencil)

// ── Extended named palette (lifted from interactive-low-poly-environment) ──
//
// Roles: each entry has a documented purpose. Keep this catalog narrow —
// adding a color means adding a name here, not inventing hex literals at
// the call site.
export const PALETTE = {
  // Core three (re-exported under names for typed access)
  primary:        PRIMARY,
  secondary:      SECONDARY,
  accent:         ACCENT,

  // Natural materials
  wood:           0xa76e17,  // warm brown plank wood
  brick:          0xd6b48e,  // soft tan brick (house walls)
  redBrick:       0x6e1e29,  // dark red-brick fireplace
  brownBrick:     0xffdba9,  // pale tan masonry
  roof:           0x783031,  // terracotta tile
  blobWood:       0xa8734e,  // softer wood for organic logs
  fenceWood:      0xa58b57,  // weathered fence palings
  pineWood:       0x7e563b,  // dark pine trunk
  dirt:           0x9b7653,  // path / soil
  rockGrey:       0x716f6b,  // generic stone
  benchGrey:      0x716f6b,  // weathered stone bench
  chimneyGrey:    0x5a564c,  // sooted chimney top

  // Foliage greens (allowed extension to the locked accent rule)
  green:          0x6c932e,  // mid grass green
  pineGreen:      0x31772f,  // dark pine needle
  grassGreen:     0x396e19,  // shadowed grass
  // (The verifier's `allowed_foliage` set covers these.)

  // Water + sky
  water:          0x52a5c1,  // clear lake water
  glass:          0x86a3ac,  // glazed window pane

  // Metal / armor
  darkMetal:      0x72636a,  // gunmetal hardware
  lightMetal:     0xdcbbb4,  // brushed bronze

  // Fire (warm-side accents — emissive features only)
  fireRed:        0xe0380a,  // base flame color
  fireOrange:     0xf48416,  // mid flame
  fireDarkYellow: 0xf3cb21,  // hot-tip flame

  // Neutrals (dark recesses, shadows, holes)
  white:          0xfdfcf7,  // off-white sky / cloud body
  black:          0x424242,  // soft black, never pure

  // Decorative / themed
  carouselPastel: 0x8094bd,  // muted blue-grey
  fog:            0xfdfcf7,  // (alias for white in the original repo)

  // Tree barks (extended for multi-species)
  birchBark:      0xe6dccb,  // off-white parchment, slight cream
  deadBark:       0x6e6356,  // dry weathered grey-brown
  palmBark:       0xb09060,  // sandy brown
  willowBark:     0x8a7050,  // muted olive-brown
  sakuraBark:     0x5e3a30,  // dark cherry-brown

  // Tree foliage (extended)
  willowGreen:    0x88a85e,  // muted yellow-green for droopy fronds
  sakuraPink:     0xe9b3c0,  // soft cherry pink
  sakuraDeepPink: 0xc9728c,  // autumn deeper pink
  leafGold:       0xc9a23a,  // autumn gold
  leafRust:       0xa44a22,  // autumn rust-orange
  leafCrimson:    0x7e2a1d,  // autumn crimson
} as const;

export type PaletteName = keyof typeof PALETTE;

// ── Variant arrays for randomized authoring (tree leaves, plane bodies) ──
export const TREE_LEAVES_COLORS = [
  0x6a241a, // Kenyan Copper
  0xe1ac46, // Urobilin
  0x982912, // Dark Pastel Red
  0xc9a23a, // leafGold
  0xa44a22, // leafRust
  0x7e2a1d, // leafCrimson
] as const;

export const AIRPLANE_COLORS = [
  0xff0000, // Red
  0xff6d0c, // Orange
  0x00f981, // Green
  0x0d5668, // Dark water blue
  0xe8375d, // Pink
] as const;

// ── Weathering + noise defaults ─────────────────────────────────────────
export const WEATHERING_AMOUNT = 0.20;
export const WEATHERING_SCALE = 6;
export const VERTEX_NOISE_AMOUNT = 0.06;

// ── Color resolution helper ─────────────────────────────────────────────
//
// Accepts a palette name string OR a numeric hex literal. Returns the int.
// AI typically uses the names; raw hex is allowed for one-off neutrals.
export type ColorInput = PaletteName | number;

export function resolveColor(input: ColorInput): number {
  if (typeof input === 'number') return input;
  return PALETTE[input];
}
