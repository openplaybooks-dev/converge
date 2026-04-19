# Screen Design Guidelines

## Screen Structure (Flutter Scaffold)

Every screen maps to a `Scaffold` with clear zones:
- **AppBar** — Title, leading (back/menu), actions (icon buttons). Collapses on scroll via `SliverAppBar`
- **Body** — Main content area, almost always scrollable
- **BottomNavigationBar** — Tab navigation shared across main screens (via `ShellRoute`)
- **FloatingActionButton** — Primary creation action (optional, bottom-right)
- **BottomSheet** — Quick actions and selections, slides up from bottom
- **PersistentFooterButtons** — Sticky action bar at bottom (e.g., "Add to Cart", "Start Reading")

## Screen Types

### Feed / List Screen
- `CustomScrollView` with `SliverAppBar` (collapsing on scroll, pinned)
- Content sections in `SliverList` or `SliverToBoxAdapter`
- Pull-to-refresh via `RefreshIndicator`
- Horizontal scroll sections for carousels (`SizedBox(height)` + `ListView(horizontal)`)
- Staggered entry animations for cards

### Detail Screen
- `CustomScrollView` with `SliverAppBar(expandedHeight: 300)` + hero image in `flexibleSpace`
- `Hero` widget wrapping the shared image element (tag matches list card)
- Content sections in `SliverToBoxAdapter` children
- Sticky bottom action bar via `Scaffold.persistentFooterButtons`
- Parallax scroll effect on hero image

### Tabbed Screen
- `DefaultTabController` wrapping the Scaffold
- `TabBar` in AppBar bottom or body top
- `TabBarView` for swipeable tab content
- Each tab body is independently scrollable
- Badge counts on tab labels for unread/new content

### Form Screen
- `SingleChildScrollView` + `Column` with `TextFormField`s
- Keyboard-aware — content scrolls above keyboard
- Real-time validation with error text below fields
- Progress indicator for multi-step forms (stepper or linear)
- Submit button sticky at bottom or in AppBar actions

### Settings Screen
- `ListView` with `ListTile` items grouped by sections
- `SwitchListTile` for toggles, `RadioListTile` for selections
- `ExpansionTile` for nested settings groups
- Section headers using `Padding` + `Text` with `labelSmall` style
- Destructive actions (logout, delete) at bottom with error color

### Grid / Browse Screen
- `CustomScrollView` with `SliverAppBar` + search bar
- `SliverGrid` for content grid (2-3 columns)
- Filter chips in a horizontal scroll above the grid
- Masonry layout for varied-height content (using `SliverMasonryGrid`)

## Navigation Patterns

### Bottom Navigation (Primary)
- 3-5 destinations maximum
- `ShellRoute` in GoRouter preserves each tab's navigation stack
- Icons: outlined when inactive, filled when active
- Labels always visible (Material 3 recommendation)
- Badge widget on icon for notification counts

### Push Navigation (Card -> Detail)
- Card tap pushes detail screen: `context.push('/novel/\${id}')`
- Back button auto-provided by AppBar in pushed routes
- Swipe-from-left-edge to pop (iOS-style, enabled by default)
- Hero transitions for shared images between list and detail

### Modal Presentation (Bottom Sheets)
- `showModalBottomSheet` for quick actions (sort, filter, share)
- `DraggableScrollableSheet` for tall content that expands
- Drag handle at top (Material 3 `showDragHandle: true`)
- Rounded top corners (`RoundedRectangleBorder`)
- Scrim (dimmed background) with tap-to-dismiss

### Dialog (Confirmations)
- `showDialog` + `AlertDialog` for destructive actions
- Title, content text, cancel + confirm buttons
- Confirm button uses error color for destructive actions

### Persistent Overlays
- Mini-player bars that float above bottom nav
- Snackbars for transient feedback (auto-dismiss, optional action)
- Banners for persistent warnings (dismissible)

## Mobile Gesture Patterns

- **Tap** — Primary interaction, all cards and buttons
- **Long press** — Context menu or selection mode
- **Swipe horizontal** — Page through content (PageView), dismiss items (Dismissible)
- **Swipe from edge** — Navigate back (pop)
- **Pull down** — Refresh content (RefreshIndicator)
- **Pinch** — Zoom images (InteractiveViewer)
- **Scroll** — Vertical content browsing, horizontal carousels
