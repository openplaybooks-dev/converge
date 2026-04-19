# Example Harness Workspace: Flutter Mobile App Generator

Demonstrates autonomous mobile app generation using the Harness V2 framework with Flutter and Dart.

## Quick Start

```bash
cd artifacts/claude-reactjs/example-flutter
flutter pub get
pnpm harness run
```

The harness will:
1. Validate your app idea
2. Generate a complete design system
3. Create screen designs using Stitch AI
4. Implement production-level Flutter theme and design tokens
5. Build Flutter screen widgets with Riverpod state management
6. Wire up GoRouter navigation

## What Gets Generated

```
.stitch/
├── UX.md                # UX overview with screens
├── SITE.md              # Sitemap and routes
├── screens.json         # Machine-readable screen definitions
├── system/
│   ├── DESIGN.md        # Complete design system
│   ├── META.md          # Design reference metadata
│   └── *.html           # HTML design references
└── designs/             # Per-screen specs and HTML designs

lib/
├── main.dart            # App entry point with ProviderScope
├── app.dart             # MaterialApp with theme
├── theme/
│   └── app_theme.dart   # ThemeData + design tokens
├── router/
│   └── app_router.dart  # GoRouter configuration
├── models/              # Freezed data classes
├── providers/           # Riverpod providers
├── screens/             # Screen widgets
├── widgets/             # Reusable widgets
└── data/
    └── mock_data.dart   # Mock data for development
```

## Running the Generated App

```bash
flutter pub get     # Install dependencies
flutter run         # Run on connected device/emulator
flutter build apk   # Android production build
flutter build ios    # iOS production build
flutter analyze     # Dart static analysis
flutter test        # Run tests
```

## Harness Commands

```bash
pnpm harness run           # Full autonomous loop
pnpm harness run --step    # Single iteration (debug)
pnpm harness run --dry     # Show gaps, don't execute
pnpm harness status        # Show current state
```

## Architecture

- **Framework**: Flutter 3.x + Dart 3.x
- **State Management**: Riverpod 2.x (code generation with riverpod_generator)
- **Routing**: GoRouter 14.x (declarative routing)
- **Data Models**: Freezed + json_serializable (immutable data classes)
- **Design**: Stitch AI for UI generation → Flutter widget conversion
- **Theming**: Material 3 with custom ThemeData and design tokens
- **Icons**: Material Symbols / Lucide Icons

## Tech Stack Choices

| Concern | Library | Why |
|---------|---------|-----|
| State | Riverpod | Compile-safe, testable, no context dependency |
| Routing | GoRouter | Declarative, deep-link ready, type-safe routes |
| Models | Freezed | Immutable, union types, JSON serialization |
| HTTP | Dio | Interceptors, cancellation, retry logic |
| Theme | Material 3 | Native feel, adaptive, accessible |

## Design Pipeline: Constrained HTML → Pixel-Perfect Flutter

The pipeline uses a **Flutter HTML Glossary** — a constrained HTML vocabulary where every element maps 1:1 to a Flutter widget:

```
DESIGN.md → SPEC.md → Constrained HTML (glossary) → stitch-flutter → Pixel-perfect Flutter widgets
```

1. **`stitch-generate`** produces HTML using ONLY glossary elements + `data-*` attributes
2. **`stitch-flutter`** mechanically converts each glossary element to its Flutter equivalent
3. **Result**: pixel-perfect widgets that use `Theme.of(context)` for all styling — no hardcoded values

The HTML serves dual purpose: visual preview in browser AND structured conversion source.

## Skills Overview

- **ux-design**: Creates UX overview from app idea
- **ux-breakdown**: Extracts screens from UX spec
- **taste-design**: Generates design system and tokens
- **stitch-generate**: Generates constrained HTML mockups using Flutter HTML Glossary
- **stitch-flutter**: Converts constrained HTML to pixel-perfect Flutter widgets (1:1 mapping)
- **flutter-widget-design**: Spec + design metadata for Flutter screens
- **flutter-riverpod-patterns**: State management patterns
- **extract-data-models-from-flutter**: Data model extraction

## Directory Structure

```
.harness/
├── playbooks/
│   └── default/
│       ├── goals/                    # 6 quality goals with metrics
│       └── tasks/
│           ├── 01-prepare-requirements/  # idea → PRD → UX → screens
│           ├── 02-design-system/         # DESIGN.md + HTML references
│           ├── 03-build-screens/         # Per-screen widget pipeline
│           ├── 05-add-behavior/          # Models, mock data, providers
│           ├── 06-wire-screens/          # Connect providers, navigation
│           └── 07-build-overlays/        # Bottom sheets, dialogs
└── skills/                           # Reusable AI instruction sets
```
