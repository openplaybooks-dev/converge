# Design System Specification: Editorial Serenity

## 1. Overview & Creative North Star
**Creative North Star: The Silent Guardian**
This design system moves away from the "utility-first" aesthetic of typical child-safety apps and toward a high-end, editorial experience. It is rooted in **Soft Minimalism**. The goal is to evoke "Calm Trust" not through loud reinforcements, but through extreme legibility, intentional white space, and a tactile sense of layering.

To break the "template" look, we employ **Asymmetric Breathing Room**. Instead of perfectly centered modules, we use generous vertical staggering (24-40dp) and varying card heights to create a rhythmic, sophisticated flow that feels curated rather than generated.

---

## 2. Colors: The Tonal Palette
The palette is anchored in warmth. Avoid pure grays; every neutral is infused with a hint of bone or sand to keep the interface feeling human and approachable.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are prohibited for sectioning. Structural boundaries must be defined solely through background color shifts.
*   **Surface-to-Surface Transition:** Place a `surface_container_lowest` (#ffffff) card on a `surface` (#fbf9f5) background to create definition.
*   **The Depth Hierarchy:** Use `surface_container_low` (#f5f4ee) for secondary background sections to "recede" behind the primary content cards.

### The "Glass & Gradient" Rule
For floating action buttons or high-priority status overlays, use **Glassmorphism**. Apply `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur. This ensures the warm background tones bleed through, maintaining a cohesive "soul" across the UI.

---

## 3. Typography: Editorial Authority
We utilize a pairing of **Plus Jakarta Sans** for characterful expression and **Manrope** for technical precision.

*   **Display & Headlines (Plus Jakarta Sans):** These are our "Editorial Voice." Use `display-lg` and `headline-lg` with tight letter-spacing (-0.02em) to create a bold, authoritative anchor for the page.
*   **Body & Labels (Manrope):** Our "Functional Voice." Manrope’s geometric but open counters ensure high readability for sleep logs and safety data.
*   **Hierarchy Note:** Use `on_surface_variant` (#5e6059) for secondary text to maintain a soft contrast ratio that is easy on the eyes during late-night usage.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are largely replaced by **Tonal Stacking**. Depth is a physical property of the paper-like surfaces.

*   **The Layering Principle:** 
    1. Base Level: `surface` (#fbf9f5)
    2. Section Level: `surface_container_low` (#f5f4ee)
    3. Interactive Level: `surface_container_lowest` (#ffffff)
*   **Ambient Shadows:** Where a card must "float" (e.g., a critical alert), use an ultra-diffused shadow: `Y: 8, Blur: 24, Color: #E7E3DC (at 40% opacity)`. 
*   **The "Ghost Border" Fallback:** If a container requires a border for accessibility, use `outline_variant` at **10% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** `on_surface` (#31332e) background with `surface` (#fbf9f5) text. High-contrast, pill-shaped (`9999px`), 56px height.
*   **Secondary:** `surface_container_high` (#e8e9e1) background. Subtle, low-impact.
*   **Tertiary:** Ghost style. No container, `label-md` weight, 12px padding.

### Status Pills (Accent Mint)
*   **Design:** Use `tertiary_container` (#dff6ee) for the pill background and `tertiary` (#4f635e) for the text. 
*   **Role:** Used exclusively for "Active," "Safe," or "Monitoring" states. Never use for decorative purposes.

### Cards & Lists
*   **Constraint:** Forbid divider lines.
*   **Implementation:** Separate list items using `12dp` of vertical white space. For grouped data, use a single `surface_container_lowest` card with `24px` internal padding (md radius).
*   **Nesting:** Small "sub-cards" inside a main container should use `surface_variant` (#e2e3db) to create a "punched-in" look.

### Input Fields
*   **Style:** Minimalist. No bottom line or box outline. Use a subtle `surface_container` (#efeee8) background with a `20px` (DEFAULT) radius. 
*   **Focus State:** Transition background to `surface_container_lowest` (#ffffff) with a 10% `outline` border.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical margins (e.g., 24dp left, 32dp right) for headline elements to create an editorial feel.
*   **Do** embrace large "voids" of white space. A single card in the center of the screen is more powerful than three stacked ones.
*   **Do** use "Soft Shadow Gray" (#E7E3DC) only for the most delicate of depth cues.

### Don't
*   **Don't** use emojis. They break the premium, calm professional tone.
*   **Don't** use pure black (#000000) for text; use the provided "Soft Black" `on_background` (#31332e).
*   **Don't** use standard 8dp spacing. Use the system's 24-40dp vertical rhythm to ensure the layout "breathes."
*   **Don't** use sharp corners. Everything must adhere to the `md` (1.5rem) or `lg` (2rem) corner radius to maintain the "Soft" brand promise.