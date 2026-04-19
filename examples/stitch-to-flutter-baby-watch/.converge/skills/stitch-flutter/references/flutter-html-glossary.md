# Flutter HTML Glossary — `data-flutter` Attributes

Minimal set of `data-flutter` hints for Flutter-specific widgets that have no HTML/Tailwind equivalent. **ALL styling is done via Tailwind classes** — these attributes only tell the converter which Flutter widget to use.

## Why Two Systems?

- **Tailwind classes** → styling (colors, spacing, typography, borders, shadows, layout)
- **`data-flutter` attributes** → widget identity (Scaffold, AppBar, Hero, CachedImage, etc.)

AI writes beautiful Tailwind naturally. `data-flutter` adds the minimal Flutter-specific context needed for accurate conversion.

---

## Scaffold & App Chrome

```html
<!-- Scaffold — the root of every screen -->
<div data-flutter="scaffold" class="flex flex-col min-h-screen bg-slate-950">

  <!-- AppBar -->
  <header data-flutter="app-bar" class="flex items-center h-14 px-4 bg-slate-900">
    <button aria-label="Back" class="w-10 h-10 ..."><svg><!-- arrow_back --></svg></button>
    <h1 class="text-lg font-semibold text-white">Title</h1>
  </header>

  <!-- Body — main scrollable content -->
  <main class="flex-1 overflow-y-auto">
    <!-- content -->
  </main>

  <!-- Bottom Navigation -->
  <nav data-flutter="bottom-nav" class="flex justify-around h-14 bg-slate-900 border-t border-slate-800">
    <button data-flutter="nav-destination" data-icon="home" data-label="Home" data-selected="true"
            class="flex flex-col items-center gap-0.5 text-amber-500">
      <svg><!-- home icon --></svg>
      <span class="text-xs">Home</span>
    </button>
    <button data-flutter="nav-destination" data-icon="search" data-label="Browse"
            class="flex flex-col items-center gap-0.5 text-slate-500">
      <svg><!-- search icon --></svg>
      <span class="text-xs">Browse</span>
    </button>
  </nav>

  <!-- FAB -->
  <button data-flutter="fab" data-icon="add" class="absolute bottom-20 right-4 w-14 h-14 rounded-full bg-amber-500 shadow-lg">
    <svg><!-- add icon --></svg>
  </button>
</div>
```

## Scrolling & Slivers

```html
<!-- CustomScrollView with SliverAppBar -->
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

<!-- Pull to refresh -->
<div data-flutter="refresh" class="flex-1">
  <!-- scrollable content -->
</div>

<!-- Safe area -->
<div data-flutter="safe-area">
  <!-- content -->
</div>
```

## Tabs

```html
<div data-flutter="tab-bar" class="flex bg-slate-900 border-b border-slate-800">
  <button class="flex-1 py-3 text-sm font-medium text-amber-500 border-b-2 border-amber-500">Reading</button>
  <button class="flex-1 py-3 text-sm font-medium text-slate-500">Completed</button>
</div>
<div data-flutter="tab-view" class="flex-1">
  <!-- tab panels -->
</div>
```

## Hero Animations

```html
<div data-flutter="hero" data-tag="novel-cover-1">
  <img class="w-20 h-28 rounded-lg object-cover" src="..." />
</div>
```

## Images

```html
<!-- CachedNetworkImage -->
<img data-flutter="cached-image" class="w-20 h-28 rounded-lg object-cover" src="..." />

<!-- Regular image (no data-flutter needed) -->
<img class="w-full h-48 object-cover" src="..." />
```

## Overlays

```html
<div data-flutter="bottom-sheet" class="bg-slate-900 rounded-t-2xl p-4">
  <!-- sheet content -->
</div>

<div data-flutter="dialog" class="bg-slate-900 rounded-2xl p-6 max-w-sm">
  <h2 class="text-lg font-semibold text-white">Confirm</h2>
  <p class="text-sm text-slate-400 mt-2">Are you sure?</p>
</div>
```

---

## Complete `data-flutter` Reference

| Value | Flutter Widget | Extra Attributes |
|-------|---------------|------------------|
| `scaffold` | `Scaffold()` | — |
| `app-bar` | `AppBar()` | — |
| `bottom-nav` | `NavigationBar()` | — |
| `nav-destination` | `NavigationDestination()` | `data-icon`, `data-label`, `data-selected` |
| `fab` | `FloatingActionButton()` | `data-icon` |
| `hero` | `Hero()` | `data-tag` |
| `cached-image` | `CachedNetworkImage()` | — |
| `sliver-app-bar` | `SliverAppBar()` | `data-expanded-height`, `data-pinned` |
| `custom-scroll` | `CustomScrollView()` | — |
| `sliver-list` | `SliverList()` | — |
| `sliver-grid` | `SliverGrid()` | `data-columns` |
| `tab-bar` | `TabBar()` | — |
| `tab-view` | `TabBarView()` | — |
| `bottom-sheet` | `showModalBottomSheet()` | — |
| `dialog` | `showDialog()` / `AlertDialog` | — |
| `safe-area` | `SafeArea()` | — |
| `refresh` | `RefreshIndicator()` | — |

---

## Rules

1. **Tailwind does ALL styling** — colors, spacing, typography, borders, shadows, layout
2. **`data-flutter` only for identity** — which Flutter widget, not how it looks
3. **`data-flutter` is optional** — most elements inferred from HTML + Tailwind (`div.flex.flex-col` → Column)
4. **Icons** — inline SVG with comment: `<!-- home -->`, `<!-- arrow_back -->`
5. **Converter reads** Tailwind classes + `data-flutter` + HTML structure — CSS is ignored
