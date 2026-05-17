# Flutter App

Autonomous Flutter mobile app generation. The playbook takes an `idea.md` and walks through requirements → design system → screens → wiring, producing a buildable Flutter project with Riverpod state management and GoRouter navigation.

## What it demonstrates

- A 6-phase pipeline with explicit `depends_on` dependencies
- Goal-level checks invoking real toolchain commands (`dart analyze lib/`)
- Skills (`.converge/skills/`) that package reusable instructions per phase
- Production output gates: theme file exists, router file exists, static analysis passes

## Setup

```bash
export MINIMAX_API_KEY=sk-...      # see .env.example at the repo root
```

The bundled `.converge/project.yml` routes both `claude` (CLI) and `acp` (Agent SDK) through MiniMax's Anthropic-compatible endpoint (`MiniMax-M2.7`). Override with `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` to use a different provider.

Flutter toolchain (`flutter` and `dart`) must be installed locally — the goal checks shell out to `dart analyze`.

## Run

```bash
cd examples/flutter-app
converge run                          # full autonomous loop
```

After the run completes, build and test the generated app normally:

```bash
flutter pub get
flutter run                           # on a connected device/emulator
flutter analyze
flutter test
```

## Phases

| # | Phase | Produces |
|---|-------|----------|
| 01 | `01-prepare-requirements` | PRD, UX overview, screen list |
| 02 | `02-design-system` | `lib/theme/app_theme.dart`, design tokens |
| 03 | `03-build-screens` | per-screen widgets in `lib/screens/` |
| 05 | `05-add-behavior` | Freezed models, Riverpod providers, mock data |
| 06 | `06-wire-screens` | GoRouter wiring in `lib/router/app_router.dart` |
| 07 | `07-build-overlays` | bottom sheets, dialogs |

## Convergence goals

```yaml
goals:
  - dart-analyze     # cmd: dart analyze lib/
  - has-theme        # cmd: test -f lib/theme/app_theme.dart
  - has-router       # cmd: test -f lib/router/app_router.dart
```

The runtime loops until every goal check passes or the attempt cap is exceeded.

## Structure

```
.converge/
├── project.yml                       # AI providers (MiniMax via Claude / ACP)
├── skills/                           # reusable per-phase instructions
└── playbooks/default/
    ├── playbook.yml                  # 6-phase task graph + 3 goal checks
    └── tasks/
        ├── 01-prepare-requirements/
        ├── 02-design-system/
        ├── 03-build-screens/
        ├── 04-generate-assets/
        ├── 05-add-behavior/
        ├── 06-wire-screens/
        └── 07-build-overlays/
```
