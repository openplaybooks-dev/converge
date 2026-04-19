# Reading a DESIGN.md

How to parse a DESIGN.md file and extract design tokens for mobile screen mockup generation. Tokens are expressed as CSS custom properties for browser preview, but map directly to Flutter's `AppTheme` constants.

**Input:** `DESIGN.md` file (project design system)
**Output:** `:root` CSS custom properties block (for preview) + Google Fonts `<link>` tag

## Section Mapping

A DESIGN.md contains up to 12 sections. Each maps to specific CSS custom properties:

| DESIGN.md Section | CSS Output | Example |
|---|---|---|
| **Color Palette** | `--color-{name}: {hex}` | `--color-primary: #58CC02` |
| **Typography** | `--font-{role}`, `--text-{size}` + Google Fonts URL | `--font-primary: 'Nunito', sans-serif` |
| **Spacing System** | `--space-{n}: {value}` | `--space-4: 16px` |
| **Border Radius** | `--radius-{size}: {value}` | `--radius-md: 16px` |
| **Shadows & Elevation** | `--shadow-{level}: {value}` | `--shadow-sm: 0 2px 4px rgba(0,0,0,0.08)` |
| **Motion & Animation** | `--ease-{name}`, `--duration-{name}` | `--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)` |
| **Visual Theme** | Atmosphere dials inform layout density, motion intensity | Used as generation guidance, not direct tokens |
| **Component Patterns** | Reference for HTML structure and state classes | Informs element markup |
| **Anti-Patterns** | Banned patterns list | Quality gate during generation |
| **Device & Safe Areas** | Phone viewport, safe area insets, status bar | `--device-width: 375px`, `--touch-min: 48px` |
| **Iconography** | Icon style, stroke width, sizes | Informs inline SVG specs |
| **Accessibility** | Contrast, touch targets, motion preferences | Informs ARIA + `prefers-reduced-motion` |

## Extraction Rules

### Colors

For every color entry like `"Leaf Green (#58CC02) — primary action"`:
- Use the **token name** from DESIGN.md as the CSS property name
- Prefix with `--color-`

```css
/* From Color Palette table */
--color-primary: #58CC02;
--color-primary-dark: #46A302;
--color-surface: #F7F7F7;
--color-bg: #FFFFFF;

/* Semantic colors */
--color-success: #58CC02;
--color-success-bg: #D7F5B1;
--color-error: #FF4B4B;
--color-error-bg: #FFD0D0;
```

### Typography

Extract font families and build the Google Fonts URL:

```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700&display=swap" rel="stylesheet" />
```

Map to CSS custom properties:

```css
--font-primary: 'Nunito', system-ui, -apple-system, sans-serif;

/* Type scale */
--text-heading-xl-size: 28px;
--text-heading-xl-weight: 700;
--text-heading-xl-lh: 1.2;

--text-body-size: 16px;
--text-body-weight: 600;
--text-body-lh: 1.5;
```

### Spacing

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
```

### Border Radius

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-pill: 999px;
```

### Shadows

```css
--shadow-sm: 0 2px 4px rgba(0,0,0,0.08);
--shadow-md: 0 4px 12px rgba(0,0,0,0.12);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.16);
```

### Motion

```css
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
```

### Device & Safe Areas

```css
/* Mobile viewport */
--device-width: 375px;
--device-height: 812px;

/* Touch targets (Material 3 minimum) */
--touch-min: 48px;

/* Scaffold chrome heights */
--app-bar-height: 56px;
--bottom-nav-height: 80px;
--status-bar-height: 44px;
--home-indicator-height: 34px;
```

## Flutter Token Mapping

The CSS tokens map to Flutter `AppTheme` constants and Material 3 theme properties:

| CSS Token | Flutter Equivalent |
|-----------|-------------------|
| `--color-primary: #hex` | `ColorScheme.fromSeed(seedColor: Color(0xFF...))` |
| `--color-surface: #hex` | `ColorScheme.surface` |
| `--font-primary: 'Outfit'` | `GoogleFonts.outfit()` in `TextTheme` |
| `--radius-md: 12px` | `AppTheme.radiusMd = 12` |
| `--space-4: 16px` | `AppTheme.spaceMd = 16` |
| `--ease-bounce: cubic-bezier(...)` | `AppTheme.easeBounce = Cubic(...)` |
| `--duration-normal: 250ms` | `AppTheme.durationNormal = Duration(milliseconds: 250)` |
| `--touch-min: 48px` | Material 3 default (48dp minimum tap target) |
| `--app-bar-height: 56px` | `AppBar` default height |
| `--bottom-nav-height: 80px` | `NavigationBar` default height |
