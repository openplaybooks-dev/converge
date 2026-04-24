# Plan: Generate DESIGN.md



Based on my review of the UX specification, screens, and design references, I now have a complete picture of the BabyGuard design system. Let me summarize my findings and the implementation plan.

---

## Implementation Plan: Generate DESIGN.md

### Step 1: Understand Requirements
- **App**: BabyGuard — child safety beacon monitoring
- **Core Identity**: Calm · Protective · Trustworthy · Warm
- **Visual Atmosphere**: Warm nursery editorial — generous whitespace, soft organic surfaces, muted earth tones
- **Reference Design Systems**: "Serene Guardian" and "Lullaby Minimal" inform the palette and principles

### Step 2: Key Design Inputs

**Color Palette (from ANALYSIS.md synthesis):**
- Surface background: `#fbf9f5` (warm papery white)
- Card surface: `#ffffff` (pure white)
- Primary: `#5f5e5e` (off-black charcoal)
- Secondary/Safe state: `#4f635e` (earthy mint-green)
- Error/Alert: `#9f403d` (muted terracotta)
- Status tints: Mint (`#D1EEDD`), Peach (`#FFDAD6`), Honey (`#FFECB3`)

**Typography:**
- Display/Headlines: Plus Jakarta Sans (700-800 weight, tight -0.02em tracking)
- Body/Labels: Manrope (400-600 weight, relaxed leading 1.6)
- **Banned**: Inter

**Design Principles:**
1. "No-Line" Rule — tonal layering over borders
2. Soft shadow: `0 8px 24px rgba(231, 227, 220, 0.4)`
3. Editorial asymmetry with generous vertical staggering (24-40dp)
4. Status Pills: rounded-full with icon + text

**Motion Philosophy:**
- Spring physics (stiffness: 100, damping: 20)
- Gentle fade-in (200ms ease-out), press feedback via subtle scale (0.98)
- Alert pulse: 1000ms ease-in-out loop
- Bottom sheet: 250ms ease-out-cubic

**Anti-Patterns to ban:**
- No emojis, no Inter font, no pure black, no neon glows
- No 3-column equal card layouts, no AI clichés ("Elevate", "Seamless")
- No fake data or metrics, no centered hero sections

### Step 3: Output Location
- File: `.stitch/system/DESIGN.md`
- Directory must be created first

---

### Critical Files for Implementation

1. **`.stitch/UX.md`** — Primary UX specification including vibe, screen inventory, design tokens
2. **`.stitch/screens.json`** — Machine-readable screen definitions with feature lists and navigation types
3. **`.stitch/references/ANALYSIS.md`** — Design system synthesis with merged color palette, typography, spacing, and component inventory

These three files fully encode the BabyGuard visual language and will inform the DESIGN.md generation.