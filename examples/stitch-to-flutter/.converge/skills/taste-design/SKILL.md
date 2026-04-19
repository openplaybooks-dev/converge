# Taste Design Skill — Mobile Design System

Generate a design system specification for mobile apps using semantic design language — no code, no framework references.

## Critical Constraint

The DESIGN.md output must contain NO code snippets, framework syntax, or API references.
Describe all design decisions in natural language with precise numeric values.
No Dart, no CSS, no HTML — only design prose with hex codes and point values.

## Inputs
- `.stitch/UX.md` — UX specification with vibe
- `.stitch/screens.json` — Screen definitions

## Output
- `.stitch/system/DESIGN.md` — Design system specification

## Procedure

1. Read UX.md vibe section and screens.json
2. Define visual atmosphere and theme name
3. Create color palette with light + dark theme values
4. Select Google Fonts typography pairing
5. Define component styles (cards, buttons, inputs, chips, bottom sheets)
6. Establish layout rhythm (spacing, padding, safe areas)
7. Define motion language (feel, speed, character)
8. Specify mobile-specific tokens (touch targets, system chrome, gestures)
9. List anti-patterns

## DESIGN.md Structure

### 1. Visual Theme
- Theme name, mood, one-sentence description
- Light/dark mode: which is primary
- Key visual metaphors

### 2. Color Palette

For each color provide: **Descriptive Name** + **Hex Code** + **Role Description**.

Example format:
```
- **Deep Ocean** (#1A2B3C) — Primary brand color, used for key actions and navigation highlights
- **Warm Ivory** (#FAF8F5) — Main background surface, light theme
- **Soft Graphite** (#3A3A3C) — Primary text color, provides comfortable reading contrast
```

Provide both light and dark theme values. Use semantic role names (not technical API names like "onPrimary" or "surfaceContainer").

Mandatory constraints:
- Maximum 1 accent color, saturation below 80%
- No purple/neon AI aesthetic
- No pure black (#000000) — use off-black or deep charcoal
- Include: brand color, background, surface, primary text, secondary text, border, accent, error

### 3. Typography

Select two Google Fonts (one display, one body). Describe their character and usage:

```
- **Display font:** [Name] — [Character description], used for headlines and hero text
- **Body font:** [Name] — [Character description], used for reading text and UI labels
```

Type scale (express sizes in points, weights as words):

| Role | Font | Weight | Size | Usage |
|------|------|--------|------|-------|
| Hero display | [Display] | Bold | 57pt | Splash screens, large hero numbers |
| Screen title | [Display] | SemiBold | 28pt | Top-level screen headings |
| Section header | [Display] | SemiBold | 22pt | Card titles, section headers |
| Subtitle | [Body] | Medium | 16pt | List item titles, subtitles |
| Body | [Body] | Regular | 16pt | Primary reading text |
| Body small | [Body] | Regular | 14pt | Secondary text, descriptions |
| Button label | [Body] | Medium | 14pt | Button text, chip labels |
| Caption | [Body] | Medium | 11pt | Badges, timestamps, tab labels |

Banned: Inter, Roboto as defaults. Select fonts with distinctive character.

### 4. Component Styles

Describe each component's visual appearance and interaction feel — no widget code, no class names.

**Card**
- Corner radius (as a number in points)
- Shadow depth and color character (e.g., "soft diffused shadow" vs "crisp drop shadow")
- Background color role
- Internal padding values
- Tap feedback feel (e.g., "subtle scale-down on press" or "gentle highlight")

**Buttons**
- Shape and corner radius
- Minimum height (48 points for touch target)
- Color roles for primary, secondary, and text variants
- Press feedback feel

**Text Input**
- Decoration style (filled background, outlined border, or underline)
- Corner radius and fill color
- Focus behavior (border color change, label animation)
- Error state appearance

**Chip**
- Shape and corner radius
- Background color for default and selected states
- Minimum height and touch target sizing

**Bottom Sheet**
- Top corner radius
- Background color
- Handle bar dimensions and color
- Maximum height (as fraction of screen, e.g., "90% for full, 50% for half")

**Navigation Bar (bottom tabs)**
- Background color
- Active/inactive indicator style
- Icon style (outlined for inactive, filled for active)
- Label visibility behavior

**App Bar**
- Background color or transparency
- Title text style reference
- Scroll behavior (e.g., "collapses on scroll" or "stays fixed")

### 5. Layout Principles

Express all spacing as point values in prose — no code declarations.

- Base spacing unit: 8 points
- Screen horizontal padding: 16 points
- Section vertical spacing: 24 points
- Card gap: 12 points
- List item minimum height: 56 points
- Minimum touch target: 48 points
- Bottom sheet handle bar: 40 points wide, 4 points tall
- Safe area awareness: respect status bar at top and home indicator at bottom

### 6. Motion & Animation

Describe transitions by their feel, duration, and character — no framework curve names or code constants.

- **Page transitions:** 300ms, smooth deceleration — content slides and fades between screens
- **Micro-interactions:** 200ms, snappy ease-out — button presses, chip selects, toggles
- **Hero transitions:** 350ms, fast-out-slow-in — shared element continuity between screens
- **Staggered lists:** 50ms delay between items — waterfall reveal as content loads
- **Bottom sheets:** 250ms, smooth deceleration — slide up from bottom edge
- **Pull-to-refresh:** 150ms, quick snap — indicator appearance and dismissal

### 7. Anti-Patterns (Banned)

Express bans as design rules, not code rules:

- No default platform colors — always use the design system palette
- No ad-hoc text sizing — always use the type scale
- No inconsistent spacing — always use the spacing tokens
- No arbitrary elevation — every shadow level must indicate hierarchy
- No Inter or Roboto as defaults — select distinctive Google Fonts
- No generic gradients or neon accents
- No shadows without purpose (every elevation should communicate hierarchy)
- No desktop patterns (sidebars, hover tooltips, right-click menus)
- No touch targets smaller than 48 points
- No critical actions outside the thumb zone (bottom two-thirds of screen)
- No pure black (#000000) — use off-black or deep charcoal
