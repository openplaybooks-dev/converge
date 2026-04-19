# Flutter Widget Design Skill

Generate screen specifications and design metadata for Flutter mobile widget creation. Every screen is designed as a native mobile experience — Scaffold-based, gesture-aware, optimized for one-handed use.

## Purpose

This skill bridges the design system and HTML references with the actual Flutter widget implementation. It creates detailed specifications that guide the `stitch-flutter` conversion skill.

## Phases

### Phase 1: Plan (SPEC.md + META.md)

Read the design system, UX spec, and screen definitions. Produce:

**SPEC.md** — Detailed mobile screen specification:
1. **Screen Title** and widget class name (e.g., `HomeFeedScreen`)
2. **Purpose** — User intent and key actions
3. **Route** — GoRouter path (e.g., `/`, `/novel/:id`)
4. **Scaffold Config**:
   - AppBar: title, leading widget, action buttons, collapsing behavior
   - BottomNavigationBar: visible? which tab active?
   - FloatingActionButton: icon, position, action
5. **Body Layout** — Scroll type and structure:
   - `SingleChildScrollView` + `Column` for simple screens
   - `CustomScrollView` + `SliverAppBar` + `SliverList` for collapsing headers
   - `ListView.builder` for long dynamic lists
   - `PageView` for swipeable pages
   - `NestedScrollView` + `TabBarView` for tabbed content
6. **Sections** — Each visual block:
   - Widget type (`ListView`, `GridView`, `Column`, `SliverList`, `Wrap`)
   - Child widgets and their props
   - Data binding points (provider → widget)
   - Interactive elements (tap, swipe, long-press)
7. **Data** — Entities and fields displayed, which Riverpod providers supply them
8. **States** — Loading (shimmer), empty (illustration + CTA), error (retry), populated
9. **Gestures & Motion**:
   - Pull-to-refresh
   - Swipe-to-dismiss (Dismissible)
   - Hero tag assignments for shared-element transitions
   - Entry animations (staggered fade-in, slide-up)
   - Scroll-driven effects (SliverAppBar parallax, opacity changes)
10. **Accessibility** — Semantics labels, focus traversal order, excluded decorative elements

**META.md** — Example selection:
- Score each reference example (1-5) on 6 dimensions
- Pick the best match for this screen's mobile pattern

### Phase 2: Generate (design.html)

Using the spec and matched example, generate an HTML design mockup following the `stitch-generate` skill.

## Flutter Mobile Widget Vocabulary

### Screen Patterns → Widget Trees

| Mobile Pattern | Flutter Widget Tree |
|---|---|
| Feed/list screen | `Scaffold` → `CustomScrollView` → `SliverAppBar` + `SliverList` |
| Detail screen | `Scaffold` → `CustomScrollView` → `SliverAppBar(expandedHeight)` + `SliverToBoxAdapter` |
| Tabbed screen | `Scaffold` → `DefaultTabController` → `NestedScrollView` → `TabBar` + `TabBarView` |
| Form screen | `Scaffold` → `SingleChildScrollView` → `Column` → `TextFormField`s |
| Settings screen | `Scaffold` → `ListView` → `ListTile`/`SwitchListTile`/`ExpansionTile` |
| Grid browser | `Scaffold` → `CustomScrollView` → `SliverAppBar` + `SliverGrid` |

### Content Elements → Widgets

| Content | Flutter Widget |
|---|---|
| Tappable card | `InkWell` → `Card` → `Padding` → `Row`/`Column` |
| Image thumbnail | `ClipRRect` → `CachedNetworkImage(fit: BoxFit.cover)` |
| Section header | `Padding` → `Row` → `Text` + `TextButton("See All")` |
| Horizontal carousel | `SizedBox(height)` → `ListView(scrollDirection: Axis.horizontal)` |
| Filter chips | `SingleChildScrollView(horizontal)` → `Wrap/Row` → `FilterChip`s |
| Progress bar | `ClipRRect` → `LinearProgressIndicator` |
| Rating stars | `Row` → `Icon(Icons.star)` + `Text` |
| Avatar | `CircleAvatar(backgroundImage: CachedNetworkImageProvider(...))` |
| Empty state | `Center` → `Column` → `Icon` + `Text` + `ElevatedButton` |
| Sticky bottom bar | `Scaffold.bottomNavigationBar` or `Scaffold.persistentFooterButtons` |

### Navigation → GoRouter

| Action | Flutter Code |
|---|---|
| Push to detail | `context.push('/novel/\${novel.id}')` |
| Switch tab | `context.go('/browse')` (via ShellRoute) |
| Pop back | `context.pop()` |
| Present bottom sheet | `showModalBottomSheet(context: context, ...)` |
| Show dialog | `showDialog(context: context, ...)` |
