# Stitch Flutter — Tailwind HTML → Pixel-Perfect Flutter

Convert HTML + Tailwind CSS design mockups into production-ready Flutter widgets. AI produces beautiful Tailwind — this skill maps every utility class to its exact Flutter equivalent.

## Design Philosophy

1. **AI generates Tailwind HTML** — what it's best at, highest design quality
2. **Minimal `data-flutter` hints** — only for Flutter-specific widgets (Scaffold, AppBar, Hero, CachedImage) that have no HTML equivalent
3. **Tailwind classes = Flutter styling** — every utility class maps to an exact Flutter property via `references/tailwind-to-flutter.md`
4. **CSS is for browser preview** — the converter reads Tailwind classes + `data-flutter` attributes, not computed CSS

## Inputs

- `.stitch/designs/{screenId}/design.html` — Tailwind HTML mockup
- `.stitch/system/DESIGN.md` — Design system specification

## Output

- `lib/screens/{snake_id}/{snake_id}_screen.dart` — Flutter screen widget

---

## Conversion Procedure

### Step 1: Parse HTML Structure

Read the HTML and identify:
1. **`data-flutter` attributes** → Flutter-specific widgets (see glossary)
2. **Tailwind classes on each element** → styling properties (see `tailwind-to-flutter.md`)
3. **HTML element type** (`div`, `button`, `img`, `span`, `nav`, `header`) → widget type hints
4. **Text content** → `Text()` widget strings
5. **`aria-*` attributes** → `Semantics()` widgets
6. **Inline SVG icons** → `Icon(Icons.{name})` or `SvgPicture.string()`

### Step 2: Determine Widget Type

For each element, use this decision tree:

1. **Has `data-flutter="scaffold"`?** → `Scaffold()`
2. **Has `data-flutter="app-bar"`?** → `AppBar()`
3. **Has `data-flutter="bottom-nav"`?** → `NavigationBar()`
4. **Has `data-flutter="hero"`?** → `Hero(tag: ...)`
5. **Has `data-flutter="cached-image"`?** → `CachedNetworkImage()`
6. **Is `<button>`?** → Determine button type from Tailwind classes
7. **Is `<img>`?** → `Image.network()` or `CachedNetworkImage()`
8. **Is text element (`<h1>`-`<h6>`, `<p>`, `<span>`)?** → `Text()`
9. **Has `flex flex-col`?** → `Column()`
10. **Has `flex` (default row)?** → `Row()`
11. **Has `grid`?** → `GridView()`
12. **Has `overflow-y-auto`?** → `SingleChildScrollView()`
13. **Has `overflow-x-auto`?** → `SingleChildScrollView(scrollDirection: Axis.horizontal)`
14. **Has `relative` with `absolute` children?** → `Stack()` + `Positioned()`
15. **Has `bg-*` + `rounded-*`?** → `DecoratedBox()` or `Container()`
16. **Has only `p-*`?** → `Padding()`
17. **Has only size classes?** → `SizedBox()`

### Step 3: Extract Styling from Tailwind Classes

For each Tailwind class, look up the Flutter equivalent in `tailwind-to-flutter.md`:

```html
<div class="flex flex-col gap-4 p-4 bg-slate-900 rounded-xl shadow-lg">
```

Parses to:
- `flex flex-col` → `Column()`
- `gap-4` → 16px spacing between children
- `p-4` → `Padding(padding: EdgeInsets.all(16))`
- `bg-slate-900` → `color: Color(0xFF0F172A)`
- `rounded-xl` → `borderRadius: BorderRadius.circular(12)`
- `shadow-lg` → `boxShadow: [BoxShadow(...)]`

Result:
```dart
Container(
  padding: const EdgeInsets.all(16),
  decoration: BoxDecoration(
    color: const Color(0xFF0F172A),
    borderRadius: BorderRadius.circular(12),
    boxShadow: const [
      BoxShadow(color: Color(0x1A000000), blurRadius: 15, offset: Offset(0, 10)),
    ],
  ),
  child: Column(
    children: [
      child1,
      const SizedBox(height: 16),
      child2,
    ],
  ),
)
```

### Step 4: Handle Text

```html
<span class="text-lg font-semibold text-white">Novel Title</span>
```

→ `fontSize: 18`, `fontWeight: FontWeight.w600`, `color: Colors.white`

```dart
Text(
  'Novel Title',
  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white),
)
```

### Step 5: Handle Buttons

| Tailwind Pattern | Flutter Button |
|---|---|
| Prominent `bg-{color}` + text color | `FilledButton` or `ElevatedButton` |
| `border` + no fill | `OutlinedButton` |
| Text only, no border/fill | `TextButton` |
| Icon only, circular | `IconButton` |

### Step 6: Handle Images

```html
<img class="w-20 h-28 rounded-lg object-cover" src="..." />
```
→ `ClipRRect` + `CachedNetworkImage(width: 80, height: 112, fit: BoxFit.cover)`

### Step 7: Handle `data-flutter` Attributes

Only for Flutter-specific widgets with no HTML equivalent:

| `data-flutter` | Flutter Widget | Extra Attributes |
|----------------|---------------|------------------|
| `scaffold` | `Scaffold()` | — |
| `app-bar` | `AppBar()` | — |
| `bottom-nav` | `NavigationBar()` | — |
| `nav-destination` | `NavigationDestination()` | `data-icon`, `data-label` |
| `fab` | `FloatingActionButton()` | `data-icon` |
| `hero` | `Hero()` | `data-tag` |
| `cached-image` | `CachedNetworkImage()` | — |
| `sliver-app-bar` | `SliverAppBar()` | `data-expanded-height`, `data-pinned` |
| `custom-scroll` | `CustomScrollView()` | — |
| `sliver-list` | `SliverList()` | — |
| `tab-bar` | `TabBar()` | — |
| `tab-view` | `TabBarView()` | — |
| `bottom-sheet` | `showModalBottomSheet()` | — |
| `safe-area` | `SafeArea()` | — |
| `refresh` | `RefreshIndicator()` | — |

### Step 8: Generate Dart File

```dart
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class {WidgetName}Screen extends StatelessWidget {
  const {WidgetName}Screen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // ... converted from Tailwind HTML
    );
  }
}
```

### Step 9: Update Router & Verify

1. Add route to `lib/router/app_router.dart`
2. `dart format lib/screens/{snake_id}/`
3. `dart analyze --no-fatal-infos lib/screens/{snake_id}/`

---

## Worked Example

### Input (Tailwind HTML)
```html
<div data-flutter="scaffold" class="flex flex-col min-h-screen bg-slate-950">
  <header data-flutter="app-bar" class="flex items-center h-14 px-2 bg-slate-900/80 backdrop-blur-lg">
    <button class="w-10 h-10 flex items-center justify-center rounded-full" aria-label="Back">
      <svg><!-- arrow_back --></svg>
    </button>
    <h1 class="text-lg font-semibold text-white ml-3">Home</h1>
  </header>

  <main class="flex-1 overflow-y-auto">
    <div class="flex flex-col gap-6 p-4">
      <h2 class="text-xl font-bold text-white">Continue Reading</h2>
      <div class="bg-slate-800 rounded-2xl p-4 shadow-lg">
        <div class="flex gap-3">
          <img data-flutter="cached-image" class="w-16 h-24 rounded-lg object-cover"
               src="https://picsum.photos/seed/n1/100/150" />
          <div class="flex flex-col flex-1 gap-1">
            <span class="text-base font-semibold text-white">The Dragon's Apprentice</span>
            <span class="text-sm text-slate-400">Chapter 42 of 120</span>
            <div class="h-1.5 bg-slate-700 rounded-full mt-1">
              <div class="h-full w-[35%] bg-amber-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <nav data-flutter="bottom-nav" class="flex justify-around h-14 bg-slate-900 border-t border-slate-800">
    <button data-flutter="nav-destination" data-icon="home" data-label="Home"
            class="flex flex-col items-center gap-0.5 text-amber-500">
      <svg><!-- home --></svg><span class="text-xs">Home</span>
    </button>
    <button data-flutter="nav-destination" data-icon="search" data-label="Browse"
            class="flex flex-col items-center gap-0.5 text-slate-500">
      <svg><!-- search --></svg><span class="text-xs">Browse</span>
    </button>
  </nav>
</div>
```

### Output (Flutter)
```dart
Scaffold(
  backgroundColor: const Color(0xFF020617),
  appBar: AppBar(
    backgroundColor: const Color(0xFF0F172A).withValues(alpha: 0.8),
    leading: IconButton(
      icon: const Icon(Icons.arrow_back), onPressed: () {}, tooltip: 'Back',
    ),
    title: const Text('Home',
      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white),
    ),
  ),
  body: SingleChildScrollView(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Continue Reading',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 15, offset: Offset(0, 10))],
            ),
            child: Row(children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: 'https://picsum.photos/seed/n1/100/150',
                  width: 64, height: 96, fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("The Dragon's Apprentice",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                  const SizedBox(height: 4),
                  const Text('Chapter 42 of 120',
                    style: TextStyle(fontSize: 14, color: Color(0xFF94A3B8))),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(9999),
                    child: const SizedBox(height: 6,
                      child: LinearProgressIndicator(value: 0.35,
                        backgroundColor: Color(0xFF334155),
                        valueColor: AlwaysStoppedAnimation(Color(0xFFF59E0B)))),
                  ),
                ],
              )),
            ]),
          ),
        ],
      ),
    ),
  ),
  bottomNavigationBar: NavigationBar(
    backgroundColor: const Color(0xFF0F172A),
    selectedIndex: 0,
    destinations: const [
      NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
      NavigationDestination(icon: Icon(Icons.search), label: 'Browse'),
    ],
  ),
)
```

---

## Cross-Reference

- **Tailwind → Flutter:** `references/tailwind-to-flutter.md` — complete class-by-class mapping
- **`data-flutter` hints:** `references/flutter-html-glossary.md` — Flutter-specific attributes
- **HTML generation:** `stitch-generate/SKILL.md` — how to produce Tailwind HTML
