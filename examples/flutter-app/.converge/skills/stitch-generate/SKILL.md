# Stitch Generate — Mobile Screen Mockups for Flutter

Generate high-fidelity mobile screen mockups for Flutter apps. Mockups use HTML + Tailwind CSS as a visual preview format — the source of truth is the screen's Flutter widget structure, not the HTML.

## Design Philosophy

1. **Think mobile-first** — design for a 375pt viewport held in one hand. Every element must be thumb-reachable, every tap target 48dp minimum
2. **Design in Scaffold** — every screen is a Scaffold: AppBar at top, scrollable body, optional BottomNavigationBar, optional FAB
3. **Use `data-flutter` for structure** — mark Flutter-specific widgets (Scaffold, AppBar, NavigationBar, Hero, SliverAppBar) that have no HTML equivalent
4. **Tailwind for visual styling** — colors, spacing, typography, borders, shadows. The `stitch-flutter` converter reads these classes and maps them to exact Flutter properties
5. **CSS is only for browser preview** — the converter ignores CSS and reads Tailwind classes + `data-flutter` attributes

## Procedure

1. Read `SPEC.md` (screen specification) and `DESIGN.md` (design system)
2. Read `references/selecting-examples.md` — select best matching example
3. Read `references/reading-design-md.md` — extract design tokens
4. Determine screen pattern (Single Screen, Multi-State, or Celebration)
5. Generate the mockup using mobile patterns + Tailwind styling + `data-flutter` hints
6. Write to `.stitch/designs/{screenId}/design.html`

## Mobile Screen Architecture

Every screen follows the Flutter Scaffold pattern:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=375, initial-scale=1.0" />
  <title>{Screen Name} — Design</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family={Font}:wght@{weights}&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            // Map DESIGN.md tokens to Tailwind colors
          },
          fontFamily: {
            // e.g., 'display': ['Outfit', 'sans-serif']
          }
        }
      }
    }
  </script>
  <style>
    body {
      font-family: 'Outfit', system-ui, sans-serif;
      background: #E8E8E8;
      display: flex;
      justify-content: center;
      padding: 32px 16px;
      min-height: 100vh;
    }
    .phone {
      width: 375px;
      min-height: 812px;
      border-radius: 40px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 24px 64px rgba(0,0,0,0.2);
    }
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
    <div data-flutter="scaffold" class="flex flex-col min-h-screen bg-slate-950">

      <!-- AppBar — top navigation chrome -->
      <header data-flutter="app-bar" class="...">
        <!-- leading: back button or menu -->
        <!-- title -->
        <!-- actions: icon buttons -->
      </header>

      <!-- Body — scrollable main content -->
      <main class="flex-1 overflow-y-auto">
        <!-- screen content sections -->
      </main>

      <!-- BottomNavigationBar — primary tab navigation -->
      <nav data-flutter="bottom-nav" class="...">
        <!-- 3-5 NavigationDestination items -->
      </nav>

      <!-- FAB — primary action (optional) -->
      <button data-flutter="fab" class="absolute bottom-20 right-4 ...">
      </button>

    </div>
  </div>
</body>
</html>
```

## Mobile Design Patterns

### Navigation Structure

Bottom navigation is the backbone of multi-screen apps:

```html
<!-- Bottom Navigation — 3-5 destinations max -->
<nav data-flutter="bottom-nav" class="flex justify-around h-14 bg-slate-900 border-t border-slate-800">
  <button data-flutter="nav-destination" data-icon="home" data-label="Home" data-selected="true"
          class="flex flex-col items-center gap-0.5 text-amber-500">
    <svg><!-- home --></svg><span class="text-xs">Home</span>
  </button>
  <button data-flutter="nav-destination" data-icon="search" data-label="Browse"
          class="flex flex-col items-center gap-0.5 text-slate-500">
    <svg><!-- search --></svg><span class="text-xs">Browse</span>
  </button>
</nav>
```

### Scrollable Content

Most mobile screens scroll. Use these patterns:

```html
<!-- Standard scrollable body -->
<main class="flex-1 overflow-y-auto">
  <div class="flex flex-col gap-6 p-4">
    <!-- sections -->
  </div>
</main>

<!-- SliverAppBar — collapsing header with hero image -->
<div data-flutter="custom-scroll" class="flex-1">
  <header data-flutter="sliver-app-bar" data-expanded-height="200" data-pinned="true"
          class="bg-slate-900">
    <img class="w-full h-full object-cover" src="..." />
    <h1 class="text-2xl font-bold text-white">Title</h1>
  </header>
  <div data-flutter="sliver-list">
    <!-- list items -->
  </div>
</div>

<!-- Pull-to-refresh -->
<div data-flutter="refresh" class="flex-1">
  <!-- scrollable content -->
</div>
```

### Cards and List Items

Mobile content is card-based and tap-driven:

```html
<!-- Tappable card navigating to detail screen -->
<div class="bg-slate-800 rounded-2xl p-4 shadow-lg">
  <div class="flex gap-3">
    <img data-flutter="cached-image"
         class="w-16 h-24 rounded-lg object-cover"
         src="https://picsum.photos/seed/n1/100/150" />
    <div class="flex flex-col flex-1 gap-1">
      <span class="text-base font-semibold text-white">The Dragon's Apprentice</span>
      <span class="text-sm text-slate-400">Sarah Chen - 142 chapters</span>
      <div class="flex items-center gap-1 mt-0.5">
        <svg class="w-4 h-4 text-amber-500"><!-- star --></svg>
        <span class="text-sm font-medium text-amber-500">4.8</span>
      </div>
    </div>
  </div>
</div>
```

### Horizontal Scroll Sections

Common mobile pattern — horizontally scrollable carousels:

```html
<div class="flex flex-col gap-2">
  <div class="flex justify-between items-center px-4">
    <span class="text-lg font-semibold text-white">Trending Now</span>
    <button class="text-sm text-amber-500">See All</button>
  </div>
  <div class="overflow-x-auto">
    <div class="flex gap-3 px-4">
      <!-- horizontally scrollable items -->
    </div>
  </div>
</div>
```

### Bottom Sheets and Overlays

Mobile-native modality — slides up from bottom:

```html
<div data-flutter="bottom-sheet" class="bg-slate-900 rounded-t-2xl p-4">
  <div class="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4"></div>
  <!-- sheet content -->
</div>
```

### Hero Transitions

Shared-element animations between list and detail screens:

```html
<div data-flutter="hero" data-tag="novel-cover-1">
  <img class="w-20 h-28 rounded-lg object-cover" src="..." />
</div>
```

## Screen Patterns

### Single Screen
Standard mobile screen with content display. One `.phone` frame.

### Multi-State
Multiple phone frames showing different states of the same screen:
```html
<div class="flex gap-8 flex-wrap">
  <div><p class="text-xs text-slate-500 mb-2 text-center">Default</p><div class="phone">...</div></div>
  <div><p class="text-xs text-slate-500 mb-2 text-center">Selected</p><div class="phone">...</div></div>
  <div><p class="text-xs text-slate-500 mb-2 text-center">Loading</p><div class="phone">...</div></div>
</div>
```

### Celebration
Achievement or completion state with confetti, animated counters, staggered reveals.

## Design Quality Bar

### Required
- **Mobile Scaffold structure** — every screen has AppBar + body + optional bottom nav/FAB
- **48dp touch targets** — all tappable elements meet Material 3 minimum
- **Thumb-zone awareness** — primary actions in bottom half, destructive actions top-right
- **Realistic data** — domain-specific content from SPEC.md, never "Lorem ipsum"
- **Accessible** — `aria-label` on icon buttons, heading hierarchy
- **Google Fonts** — loaded in `<head>`
- **Phone frame** — 375px width with `.phone` wrapper

### Banned
- No desktop/web layout patterns (sidebars, multi-column grids, hover states)
- No responsive breakpoints — single mobile viewport
- No inline `style=""` attributes for layout (use Tailwind classes)
- No custom CSS class names for layout — `.my-card`, `.header-section` etc.
- No Inter font (use Outfit, Nunito, Satoshi, DM Sans, Space Grotesk)
- No pure `text-black` — use `text-slate-900` or `text-white`
- No `lorem ipsum` — realistic content
- No placeholder image URLs — use `picsum.photos/seed/{name}/{w}/{h}` or CSS gradients
- No 3-column equal grids — use asymmetric layouts or horizontal scroll
- No circular loading spinners — use shimmer/skeleton

## Cross-Reference

- **Tailwind to Flutter mapping:** `stitch-flutter/references/tailwind-to-flutter.md`
- **`data-flutter` hints:** `stitch-flutter/references/flutter-html-glossary.md`
- **Token extraction:** `references/reading-design-md.md`
- **Example selection:** `references/selecting-examples.md`
- **Generation workflow:** `references/generating-html-screens.md`
- **Conversion skill:** `stitch-flutter/SKILL.md`
