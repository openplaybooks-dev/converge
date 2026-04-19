# Design Mappings & Descriptors

Use these mappings to transform vague user requests into precise, high-fidelity design instructions.

## UI/UX Keyword Refinement

| Vague Term | Enhanced Professional Terminology |
|:---|:---|
| "menu at the top" | "AppBar with title and action icons" |
| "big photo" | "hero section with CachedNetworkImage and gradient overlay" |
| "list of things" | "ListView with Card children, elevation and rounded corners" |
| "button" | "FilledButton with primary color and ripple feedback" |
| "form" | "Column of TextFormField with validation and submit FilledButton" |
| "picture area" | "SliverAppBar with flexibleSpace background image" |
| "sidebar" | "NavigationDrawer with ListTile items and header" |
| "popup" | "showModalBottomSheet with DraggableScrollableSheet" |
| "tabs" | "DefaultTabController with TabBar and TabBarView" |
| "bottom menu" | "NavigationBar with NavigationDestination items" |

## Atmosphere & "Vibe" Descriptors

| Basic Vibe | Enhanced Design Description |
|:---|:---|
| "Modern" | "Clean, minimal, generous whitespace, high-contrast TextTheme, Material 3 surfaces" |
| "Professional" | "Sophisticated, subtle elevation, restricted ColorScheme, structured spacing" |
| "Fun / Playful" | "Vibrant primary colors, large border radius, spring Curves, bounce animations" |
| "Dark Mode" | "Dark ColorScheme, high-contrast onSurface, subtle surfaceContainer elevation" |
| "Luxury" | "Elegant, serif displayLarge, dramatic hero images, minimal UI chrome" |
| "Warm" | "Amber/coral seed colors, rounded cards, gentle easeOutCubic transitions" |

## Flutter Shape Translation

- **Pill-shaped**: `BorderRadius.circular(9999)` — chips, search bars, tags
- **Softly rounded**: `BorderRadius.circular(16)` — cards, bottom sheets
- **Gently rounded**: `BorderRadius.circular(12)` — buttons, inputs
- **Slightly rounded**: `BorderRadius.circular(8)` — small elements, thumbnails
- **Sharp**: `BorderRadius.zero` — dividers, list tiles

## Depth & Elevation (Material 3)

- **Level 0**: No shadow — flat elements, background surfaces
- **Level 1**: `elevation: 1` — cards, raised surfaces
- **Level 2**: `elevation: 2` — floating buttons, lifted cards
- **Level 3**: `elevation: 3` — navigation bars, app bars
- **Level 4**: `elevation: 6` — FABs, modals
- **Level 5**: `elevation: 8` — bottom sheets, dialogs
