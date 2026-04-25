# stitch-to-flutter-baby-watch (v2)

Second-generation version of the `stitch-to-flutter-baby-watch` example.

## Goal

**Input:** `idea.md` + `.stitch/references/` (Stitch-authored UI references — PNG + HTML per screen, DESIGN.md per design system).

**Output:** a production-ready Flutter app in `lib/` with tests in `test/`. Not a demo, not a toy. Every screen renders, every behavior works, handlers are bound, states (empty / loading / error) are covered, widget tests pass, accessibility is validated.

## What changed vs v1

v1 (`../stitch-to-flutter-baby-watch/`) was derived from `../baby-app/` and retrofitted to consume `.stitch/references/`. It worked, but:

- Only 7/12 screens completed in the last session (5 stuck in conversion).
- Wiring stalled on missing `@converge:element` markers because 03-convert didn't pre-seed them.
- No production gates: no empty/loading/error states, no widget tests, no a11y.

v2 inverts the flow and adds production gates.

| Area | v1 | v2 |
| --- | --- | --- |
| Phase 01 | idea → PRD → UX → breakdown → analyze-refs → enrich | analyze-refs → (PRD + UX grounded in refs) → derive-screens-json → derive-data-entities |
| Phase 02 | generate DESIGN.md from UX + idea (creative) | pick the dominant reference design system, copy its DESIGN.md, extract tokens.json, emit Flutter theme mechanically |
| Phase 03 | 6-step per-screen pipeline; references consulted as hint | 7-step per-screen pipeline, branched on `htmlReference`: link → normalize-to-glossary → convert (with marker pre-seeding) → analyze → split → lift → states |
| Phase 06 | 002-analyze-navigations *creates* markers post-hoc | 002-analyze-navigations *verifies* markers, fails loudly if any are missing (forces 03 to do its job) |
| Phase 07 | overlays discovered from UX or AI | overlays extracted from nested markup in reference HTML first, AI fallback only |
| Phase 08 | — | per-screen widget tests with provider overrides + state coverage |
| Phase 09 | — | per-screen accessibility pass (semantics, tap targets, contrast) |

## Layout

```
.
├── idea.md                              # domain intent (copied from v1)
├── .stitch/references/                  # pixel-truth (copied from v1)
├── .converge/
│   ├── project.yml                      # provider + model config
│   ├── skills → ../../stitch-to-flutter-baby-watch/.converge/skills  (symlink)
│   └── playbooks/default/
│       ├── playbook.yml                 # 9 phases, sequential
│       ├── scripts/verify-markers.js    # top-level check
│       └── tasks/
│           ├── 01-prepare-requirements/    # 6 subtasks
│           ├── 02-design-system/           # 5 subtasks
│           ├── 03-build-screens/           # WBS: branched per-screen pipeline
│           ├── 05-add-behavior/            # 4 subtasks
│           ├── 06-wire-screens/            # 4 subtasks; markers pre-seeded
│           ├── 07-build-overlays/          # WBS: per-overlay pipeline
│           ├── 08-test-screens/            # WBS: per-screen test writer (NEW)
│           └── 09-accessibility/           # WBS: per-screen a11y pass (NEW)
├── pubspec.yaml
├── analysis_options.yaml
└── lib/                                 # generated
    └── test/                            # generated
```

## Run

```bash
# From this directory:
converge run

# Or use the converge CLI to run a specific phase:
converge run --phase 01-prepare-requirements
```

The top-level `checks:` in `playbook.yml` gate the run:
- `dart analyze lib/ test/`
- `flutter test`
- `lib/theme/app_theme.dart` and `lib/router/app_router.dart` exist
- `node .converge/playbooks/default/scripts/verify-markers.js` — no unbound `@converge:element` markers

## Non-goals in v2

- **Golden-image pixel-diff fidelity check** — deferred to v3. v2 relies on structural fidelity only.
- **Parallel per-screen pipelines** — phase 03 screens chain sequentially for determinism.
- **Real native features** — BLE, push, camera, background location: mock providers only.
- **CI / release packaging.**

## Comparing v2 output to v1

Once v2 runs to completion, pick three sample screens (`home-safe`, `history`, `settings`) and compare:
- `lib/screens/<id>/<id>_screen.dart` side-by-side with v1's equivalent — v2 should have `@converge:element` markers throughout and a sibling `<id>_states.dart`.
- The reference `.stitch/references/<dir>/screen.png` side-by-side with the running Flutter app (screenshot) — v2 should visibly match sections, colors, typography.
- Test output: `flutter test` in v2 should produce ≥ 1 test per screen; v1 had no tests.
