# Generating Mobile Screen Mockups (Flutter Target)

The complete workflow for generating a self-contained mobile screen mockup using the **Flutter HTML Glossary** vocabulary. Every mockup represents a single Flutter Scaffold — think of the HTML as a visual blueprint for the widget tree.

**Input:** `.stitch/designs/{screenId}/SPEC.md` + `DESIGN.md` + matched example HTML
**Output:** `.stitch/designs/{screenId}/design.html`

## Critical Rule

All HTML elements MUST use classes and `data-*` attributes from the **Flutter HTML Glossary** (`stitch-flutter/references/flutter-html-glossary.md`). This ensures pixel-perfect mechanical conversion to Flutter widgets.

## Step 1: Analyze the Spec

Read the SPEC.md and identify the mobile screen structure:

1. **Scaffold chrome** — AppBar (title, leading, actions), BottomNavigationBar, FloatingActionButton
2. **Body structure** — scrollable content sections, SliverAppBar collapsing behavior, pull-to-refresh
3. **Data shape** — what entities are displayed, their fields and types
4. **Interaction states** — default, selected, loading (shimmer), empty, error
5. **Navigation targets** — which bottom tab is active, where card taps push to, what bottom sheets present
6. **Gestures** — swipe-to-dismiss, pull-to-refresh, long-press, horizontal scroll

This determines the screen pattern (Single Screen, Multi-State, or Celebration).

## Step 2: Study the Matched Example

Read the selected example's HTML file and note:

- **Scaffold structure** — how AppBar, body, bottom nav, FAB are arranged
- **`:root` token block** — how design tokens are organized
- **Phone frame** — `.phone` wrapper (375x812pt, 40px radius)
- **Mobile patterns** — scroll behavior, card tap areas, horizontal carousels, bottom sheets
- **`data-flutter` usage** — which Flutter widgets are annotated
- **Animation approach** — `@keyframes` and `data-animate` for entry/exit transitions
- **State representation** — how loading, empty, selected states are shown

## Step 3: Build the `:root` Block

Parse the DESIGN.md per `reading-design-md.md` and build the complete `:root` block. These tokens mirror the Flutter `AppTheme` constants — CSS makes the mockup look correct in a browser, while the `data-*` attributes encode the Flutter widget tree.

```css
:root {
  /* ── Colors (map to ColorScheme) ── */
  --color-primary: #D4A520;
  --color-on-primary: #FFFFFF;
  --color-surface: #16213E;
  --color-on-surface: #E8E6E3;
  --color-background: #1A1A2E;

  /* ── Typography (map to TextTheme via GoogleFonts) ── */
  --font-primary: 'Outfit', sans-serif;

  /* ── Spacing (map to AppTheme constants) ── */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;

  /* ── Radius (map to AppTheme.radiusX) ── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* ── Motion (map to AppTheme curves/durations) ── */
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
}
```

## Step 4: Build the HTML Document

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=375, initial-scale=1.0" />
  <title>{Screen Name} — Design</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root { /* tokens */ }

    body {
      font-family: var(--font-primary);
      background: #E8E8E8;
      display: flex;
      justify-content: center;
      padding: 32px 16px;
      min-height: 100vh;
    }

    .phone {
      width: 375px;
      min-height: 812px;
      background: var(--color-background);
      border-radius: 40px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 24px 64px rgba(0,0,0,0.2);
    }

    /* ── Glossary element styling ── */
    /* CSS here makes the glossary elements LOOK correct in browser */
    /* The converter reads data-* attributes, not CSS */

    .scaffold { display: flex; flex-direction: column; min-height: 100%; }
    .app-bar { display: flex; align-items: center; height: 56px; padding: 0 var(--space-sm); }
    .body { flex: 1; overflow-y: auto; }
    .bottom-nav { display: flex; justify-content: space-around; height: 56px; border-top: 1px solid rgba(255,255,255,0.1); }

    .column { display: flex; flex-direction: column; }
    .row { display: flex; flex-direction: row; align-items: center; }
    .center { display: flex; justify-content: center; align-items: center; }
    .expanded { flex: 1; }
    .wrap { display: flex; flex-wrap: wrap; }

    /* ... more glossary element styles ... */

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
</head>
<body>
  <div class="phone">
    <div class="scaffold">
      <header class="app-bar" data-color="surface">
        <div class="app-bar__title">
          <span class="title-large" data-color="on-surface">{Title}</span>
        </div>
      </header>
      <main class="body">
        <!-- Glossary elements only -->
      </main>
      <nav class="bottom-nav" data-color="surface">
        <!-- bottom-nav__item elements -->
      </nav>
    </div>
  </div>
</body>
</html>
```

## Step 5: Use ONLY Glossary Elements

When building the screen content:

### For a card list:
```html
<div class="list-view" data-separator="false">
  <div class="ink-well" data-route="/novel/1">
    <div class="card" data-radius="md" data-elevation="1">
      <div class="padding" data-p="md">
        <div class="row" data-spacing="md">
          <div class="clip-rrect" data-radius="sm">
            <img class="network-image" data-src="https://picsum.photos/seed/n1/100/150" data-w="80" data-h="120" />
          </div>
          <div class="column expanded" data-spacing="xs">
            <span class="title-medium" data-color="on-surface">The Dragon's Apprentice</span>
            <span class="body-small" data-color="on-surface-variant">Sarah Chen</span>
            <div class="row" data-spacing="xs">
              <svg class="icon" data-name="star" data-size="16" data-color="primary"></svg>
              <span class="label-small" data-color="on-surface-variant">4.8</span>
            </div>
          </div>
          <svg class="icon" data-name="chevron_right" data-size="24" data-color="on-surface-variant"></svg>
        </div>
      </div>
    </div>
  </div>
</div>
```

### For a horizontal scroll section:
```html
<div class="column" data-spacing="sm">
  <div class="padding" data-px="md">
    <div class="row" data-main-axis="space-between">
      <span class="title-medium" data-color="on-surface">Trending Now</span>
      <button class="text-btn">See All</button>
    </div>
  </div>
  <div class="horizontal-scroll">
    <div class="row" data-spacing="sm">
      <div class="padding" data-pl="md">
        <div class="ink-well" data-route="/novel/1">
          <!-- card content -->
        </div>
      </div>
      <!-- more items -->
    </div>
  </div>
</div>
```

### For filter chips:
```html
<div class="horizontal-scroll">
  <div class="row" data-spacing="sm">
    <div class="padding" data-pl="md">
      <div class="filter-chip" data-label="All" data-selected="true"></div>
    </div>
    <div class="filter-chip" data-label="Fantasy" data-selected="false"></div>
    <div class="filter-chip" data-label="Sci-Fi" data-selected="false"></div>
    <div class="filter-chip" data-label="Romance" data-selected="false"></div>
  </div>
</div>
```

## Step 6: CSS Styling for Browser Preview

The CSS makes the mockup look like a real mobile app in the browser. Style each glossary class to match the Flutter design system. The converter **ignores CSS** — it reads only HTML structure + `data-*` attributes.

```css
/* Cards */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

/* Buttons */
.elevated-btn {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
  font-weight: 600;
  border: none;
  cursor: pointer;
  min-height: 44px;
}

/* Text styles */
.title-large { font-size: 22px; font-weight: 600; }
.title-medium { font-size: 16px; font-weight: 500; }
.body-large { font-size: 16px; font-weight: 400; }
.body-medium { font-size: 14px; font-weight: 400; }
.body-small { font-size: 12px; font-weight: 400; }
.label-small { font-size: 11px; font-weight: 500; }
```

## Step 7: Animations

Define `@keyframes` in CSS for browser preview, and encode with `data-animate` for Flutter conversion:

```html
<!-- Element with animation -->
<div class="card" data-animate="fade-in" data-animate-delay="0" data-animate-duration="300">
```

```css
/* Browser preview animation */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
[data-animate="fade-in"] {
  animation: fade-in var(--duration-normal) var(--ease-out) backwards;
}
[data-animate-delay="100"] { animation-delay: 100ms; }
[data-animate-delay="200"] { animation-delay: 200ms; }
```

## Step 8: Mobile Accessibility

| Requirement | Implementation |
|---|---|
| Touch targets | `min-height: 48px` on all tappable elements (Material 3 minimum) |
| Interactive elements labeled | `aria-label="Close"` on icon buttons → `Semantics()` in Flutter |
| Active tab indicated | `data-selected="true"` on active nav destination |
| Navigation landmarks | `<nav class="bottom-nav">` → `NavigationBar` |
| Decorative content hidden | `aria-hidden="true"` on decorative icons → `excludeSemantics` |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` → `MediaQuery.disableAnimations` |
| Heading hierarchy | Typography classes in logical order → `Semantics(header: true)` |
| Thumb reachability | Primary actions in bottom half of screen |

## Cross-Reference

- Token extraction: `reading-design-md.md`
- Example selection: `selecting-examples.md`
- Glossary: `stitch-flutter/references/flutter-html-glossary.md`
- Conversion: `stitch-flutter/SKILL.md`
