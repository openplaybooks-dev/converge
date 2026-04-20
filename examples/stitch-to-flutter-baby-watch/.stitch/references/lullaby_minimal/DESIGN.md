# Design System Document: The Serene Sentinel

## 1. Overview & Creative North Star

**Creative North Star: The Serene Sentinel**
This design system is built to transcend the clinical, cold nature of traditional monitoring software. It rejects the "utility-first" aesthetic in favor of a **High-End Editorial** experience. We treat the interface not as a dashboard, but as a digital nursery—calm, breathable, and deeply trustworthy. 

To break the "template" look, we leverage **Intentional Asymmetry** and **Tonal Depth**. By utilizing wide margins, dramatic typography scales, and a rejection of traditional borders, we create a signature visual identity that feels custom-tailored for the modern parent. We don't just show data; we provide peace of mind through a sophisticated, layered atmosphere.

---

## 2. Colors & Surface Philosophy

Our palette is rooted in organic, warm neutrals that reduce eye strain and promote a sense of calm.

### The Color Tokens
*   **Background (`surface`):** `#fbf9f5` — A warm, papery white that serves as our canvas.
*   **Primary Action (`primary`):** `#5f5e5e` — A sophisticated off-black/charcoal for authoritative interactions.
*   **Status Safe (`secondary`):** `#4f635e` — An earthy mint-green that signals safety without the harshness of "traffic light" green.
*   **Error (`error`):** `#9f403d` — A muted, terracotta red for alerts.

### The "No-Line" Rule
Explicitly prohibited: 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts or tonal transitions. To separate a section, transition from `surface` to `surface-container-low`.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine vellum.
1.  **Level 0 (Base):** `surface` (#fbf9f5).
2.  **Level 1 (Sectioning):** `surface-container-low` (#f5f4ee) for large background blocks.
3.  **Level 2 (Cards):** `surface-container-lowest` (#ffffff) for the highest prominence elements.

### Signature Textures & Glassmorphism
To add "soul," use subtle gradients for main CTAs, transitioning from `primary` (#5f5e5e) to `primary-dim` (#535252). For floating elements (e.g., top navigation or bottom sheets), utilize **Glassmorphism**: a semi-transparent `surface` color with a 20px backdrop-blur to allow underlying colors to bleed through softly.

---

## 3. Typography: Editorial Authority

We use **Plus Jakarta Sans** exclusively. It provides a clean, airy feel that is both modern and approachable.

*   **Display-LG (3.5rem):** Reserved for high-impact status updates (e.g., "Asleep"). Use tight letter-spacing (-0.02em).
*   **Headline-MD (1.75rem):** For screen titles. These should have generous top-padding to create an editorial "header" feel.
*   **Title-SM (1rem):** Used for card headings. Bold weight to provide clear anchoring.
*   **Body-LG (1rem):** The standard for all primary reading. Line height should be generous (1.6) to maximize breathability.
*   **Label-MD (0.75rem):** All-caps with 0.05em tracking for secondary metadata, conveying a premium, curated look.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows often feel "muddy." In this system, depth is achieved through **Tonal Layering**.

### The Layering Principle
Place a `surface-container-lowest` (White) card on a `surface-container-low` (Beige) section. This creates a soft, natural lift that mimics paper sitting on a desk without needing a drop shadow.

### Ambient Shadows
When a "floating" effect is mandatory (e.g., a primary button), use an **Ambient Shadow**:
*   **Blur:** 32px
*   **Y-Offset:** 8px
*   **Color:** `on-surface` (#31332e) at **4% opacity**. It should feel like a whisper of light, not a hard edge.

### The "Ghost Border" Fallback
If a border is required for accessibility, it must be a **Ghost Border**: `outline-variant` (#b1b3ab) at 15% opacity. Never use 100% opaque borders.

---

## 5. Components

### Cards & Lists
*   **Styling:** Radius of `xl` (3rem) for parent containers; `lg` (2rem) for nested cards.
*   **Rule:** Forbid divider lines. Use vertical white space (32px or 48px) to separate content. For lists, use a subtle `surface-container-low` background on hover.

### Buttons
*   **Primary:** Solid `primary` (#5f5e5e) with `on-primary` (#faf7f6) text. Radius: `full`.
*   **Secondary:** Ghost style using a **Ghost Border**.
*   **States:** On press, scale the button slightly (0.98) rather than changing the color drastically.

### Input Fields
*   **Style:** Minimalist. No bounding box. Only a `surface-variant` (#e2e3db) bottom bar (2px).
*   **Focus State:** The bottom bar transitions to `primary` with a soft `surface-tint` glow.

### Signature App-Specific Components
1.  **The Sleep Waveform:** A custom visualization using the `secondary` (Mint) color with a soft linear gradient to transparent.
2.  **Status Orb:** A floating 8px circle using `secondary_fixed` for "Safe" and `error_container` for "Alert," utilizing a 12px ambient glow of the same color.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical padding (e.g., 24px left, 40px right) for headers to create an editorial feel.
*   **Do** prioritize white space over "filling the screen."
*   **Do** use `secondary` (Mint) as the primary indicator of safety.

### Don’t
*   **Don't** use standard "Blue" for links or buttons; it breaks the Serene Sentinel palette.
*   **Don't** use 1px dividers or high-contrast borders.
*   **Don't** use pure black (#000000). Always use our `on-surface` soft black (#31332e).
*   **Don't** crowd elements. If a screen feels "busy," increase the Spacing Scale.