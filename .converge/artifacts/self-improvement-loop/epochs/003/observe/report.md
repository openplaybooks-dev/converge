# Audit Report: Model #3 — Framework vs. Project

**Epoch**: 3
**Mental Model**: Framework vs. Project (CLAUDE.md §3.5, AGENTS.md §3.5)
**Model Rule**: NEVER hardcode project specifics (paths, skill names, asset names, domain concepts) into framework code in `packages/`. Project-specific behavior goes in `.converge/`.

## Step 1: The Mental Model

CLAUDE.md §3.5 states: framework code (`packages/`) must remain generic — no project-specific paths, skill names, asset names, or domain concepts. Projects (`examples/`) are specific. The examples table calls out `skill: "image-generate"` in dag-run.ts, `assets/concept/master/master.png`, and `"grassland-${category}-${id}"` as violations.

## Step 2: Trace

Commands run:
```
grep -rn "\.converge/" packages/core/src/ packages/cli/src/ | head -30
grep -rn "examples/" packages/core/src/ packages/cli/src/ | head -15
```

Files audited:
- `packages/core/src/planning/progressive-decomposition/analyze.ts` (full file)
- `packages/core/src/planning/progressive-decomposition/implement-executable.ts` (relevant sections)
- `packages/core/src/planning/progressive-decomposition/task-md-schema.ts` (full file)
- `packages/core/src/validation/validate.ts` (TASK.md discovery section)
- `packages/core/src/plugins/loader.ts` (plugin resolution)
- `packages/core/src/meta/analyzer.ts` (default config)
- `packages/core/src/meta/sidecar.ts` (header comments)
- `packages/core/src/storage/types.ts` (StoragePaths interface)
- `packages/cli/src/commands-add.ts` (examples catalog loading)
- `packages/cli/src/commands.ts` (init command)

## Step 3: Findings

### Finding 1 (HIGH) — Project-specific example hardcoded in framework prompts

**Files**: `packages/core/src/planning/progressive-decomposition/`

The example project `cinematic-video-production` is hardcoded as a reference path in three framework source files that generate LLM prompt text:

1. `analyze.ts:244-245` — `examples/cinematic-video-production/.converge/playbooks/default/tasks/02-cast/001-extract/TASK.md`
2. `implement-executable.ts:111-112` — same path
3. `task-md-schema.ts:8,82` — same path, plus another on line 8

These are framework-internal prompt templates. The specific example name `cinematic-video-production` is a project-specific domain concept leaking into generic framework code. A new project using converge should not have its framework prompts referencing a specific unrelated example project. The framework should use a configurable example directory or a generic placeholder.

This is directly analogous to the `skill: "image-generate"` violation in the CLAUDE.md §3.5 table.

### Finding 2 (MEDIUM) — Hardcoded `.converge/` subdirectory paths scattered without central config

`validation/validate.ts:158-161` hardcodes TASK.md discovery globs (`".converge/epics/**/*/TASK.md"` etc.) as string literals. These could be read from StoragePaths or a central path registry.

`meta/analyzer.ts:131` hardcodes `proposalsDir: ".converge/meta/proposals"` as a default. While `.converge/` is framework-owned, the subdirectory structure (`meta/proposals`) is specific to the meta-optimization feature.

### Finding 3 (INFO) — Non-violations (framework conventions, not project leaks)

- `.converge/` references in `storage/types.ts`, `plugins/loader.ts`, `sidecar.ts` are framework directory conventions, not project-specific paths. These are acceptable.
- `examples/` references in `commands-add.ts` (catalog loading, git sparse checkout) are framework infrastructure for its own example system — not project-specific example names.

## Step 4: Proposed Correction (for Finding 1)

**What test to write**: `tests/planning/prompt-templates.test.ts` — greps all files in `packages/core/src/planning/` for the string `cinematic-video-production` and fails if found. Encodes the rule that no project-specific example names may appear in framework code.

**What code change**: Replace hardcoded `examples/cinematic-video-production/...` paths with a generic placeholder like `{example_path}` or read a configured example reference from the project's config.

**Why this prevents future violations**: The test makes the model enforceable. Any future developer who adds a project-specific reference to framework prompts will hit the failing test before merging.
