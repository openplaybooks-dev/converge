# Framework troubleshooting playbook

Symptom → root cause → fix recipes for **framework bugs** (under `packages/`). Distinct from `converge-control`'s playbook, which covers user-playbook bugs.

**This file grows.** Append new entries each time the dev loop fixes a novel framework bug (step 8 of `SKILL.md`). Never delete an entry unless the bug class no longer applies (e.g. the subsystem was rewritten and the symptom is impossible).

## Entry format

Each entry follows this structure. Copy it when adding a new one:

```markdown
## <symptom in one sentence, as the user / operator would describe it>

**Symptom**
- What you observe in stdout / journal / checkpoint / artifacts
- Exact log lines if available

**Root cause**
- The actual code-level reason. Cite file paths.

**Fix**
- The patch applied. Cite file paths and what changed (one or two sentences, not a diff).

**Verification**
- Exact commands run after the fix to confirm
- What you expected to see in the output

**Files touched**
- List of `packages/**` files modified
```

---

## Skill symlinks land in the monorepo root's `.claude/skills/` instead of the example's

**Symptom**
- After running an example like `examples/autonomous-pentest`, the example's skills appear as symlinks under `<repo-root>/.claude/skills/` instead of `examples/<name>/.claude/skills/`.
- Console line during the run: `🔗 Creating skill junctions in: /Users/.../converge/.claude/skills`. The path is the monorepo root, not the example dir.
- Symlinks point to `../../examples/<name>/.converge/skills/<skill>` — clearly the framework knew about the example's skills but resolved the install location to the wrong root.
- Symlinks persist after the run (cleanup also runs against the wrong dir).

**Root cause**
The framework had **six** `findProjectRoot` implementations across packages, each using a different heuristic. The buggy ones either:
1. Walked up looking for `.claude/` first (`agentfn.ts:36`, `compose.ts:26`) — climbed past the example to the monorepo root if the example had `.converge/` but no `.claude/`.
2. Walked up looking for `pnpm-workspace.yaml`/`package.json` (`agentfn/skills.ts:417`, `kimifn/skills.ts:19`, `geminifn/skills.ts:19`, `qwenfn/skills.ts:19`) — every example lacks both files but the monorepo root has them, so the walk always landed at the monorepo root.

In `agentfn.ts`, the `agentfn()` function computed the *correct* `symlinkTarget` on line 183, then the legacy-skills branch at line 218–222 silently *overwrote* it using the bad `_findProjectRoot` from `agentfn/skills.ts`.

**Fix**
Established a single canonical rule: **project root = nearest ancestor (or self) containing `.converge/`**. Period. No `.claude/` preference. No workspace markers. No `process.cwd()` escape hatches.

Implemented as a small `findConvergeRoot(startDir)` helper inlined into each fn package that needs it. Migrated every call site:

- `agentfn/agentfn.ts` — deleted local `findProjectRoot`, imported `findConvergeRoot`. Rewrote the legacy-skills branch to reuse the already-computed `projectRoot` instead of re-resolving.
- `agentfn/compose.ts` — same treatment.
- `agentfn/skills.ts` — deleted `_findProjectRoot`. `_getConvergeDir`, `listSkills`, and `legacyGetSkillPath` now use `findConvergeRoot`.
- `kimifn/src/skills.ts`, `geminifn/src/skills.ts`, `qwenfn/src/skills.ts` — deleted local `findProjectRoot`, imported `findConvergeRoot`. `getSkillsDir` and `getAgentsDir` retain the `<root>/skills/` and `<root>/agents/` path shape; only the root-finding logic changed.
- `core/src/client/converge-client.ts` — removed the `process.env.CONVERGE_PROJECT_DIR ?? process.cwd()` fallback. The SDK now hard-fails with a clear error if `CONVERGE_PROJECT_DIR` (or `parsed.projectDir` from `CONVERGE_CONTEXT_JSON`) is missing. No silent guesses.

**Verification**
1. New package's own tests pass:
   ```bash
   cd /Users/minh/Documents/converge/packages/project-root && pnpm test
   # → 9 passed
   ```
2. Full monorepo build clean:
   ```bash
   cd /Users/minh/Documents/converge && pnpm build
   ```
3. End-to-end check of the resolved path with a synthetic monorepo + nested example:
   ```bash
   # Tempdir with .converge/ at outer level AND inside examples/demo/.
   # findConvergeRoot from inside examples/demo/tasks/recon must return
   # examples/demo, NOT the outer monorepo root. Verified.
   ```
4. Per-package test counts unchanged from baseline (zero regressions).
5. Manual: re-run any example that has `.converge/skills/`. Watch the `🔗 Creating skill junctions in:` line — path must end in `examples/<name>/.claude/skills`, not `<monorepo>/.claude/skills`.

**Files touched**
- `packages/project-root/` (new package: `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `tests/find-converge-root.test.ts`)
- `packages/agentfn/package.json` (added dep)
- `packages/agentfn/vitest.config.ts` (added alias)
- `packages/agentfn/src/agentfn.ts`
- `packages/agentfn/src/compose.ts`
- `packages/agentfn/src/skills.ts`
- `packages/kimifn/package.json` (added dep)
- `packages/kimifn/src/skills.ts`
- `packages/geminifn/package.json` (added dep)
- `packages/geminifn/src/skills.ts`
- `packages/qwenfn/package.json` (added dep)
- `packages/qwenfn/src/skills.ts`
- `packages/core/src/client/converge-client.ts`

---

<!--
Four obsolete seed-subsystem entries were removed here. They covered:
  - Shared seed script path resolution
  - Transient errors triggering seed-script-repair
  - `seedConfigGap is not defined` crash in resolve-seed
  - SeedScriptRepairStrategy scriptPath bug
All four reference deleted files (`packages/core/src/executor/seed-executor.ts`,
`navigator/core/actions/resolution/resolve-seed.ts`,
`navigator/repair/strategies/{seed-script-repair,missing-seed-script}.ts`).
With RFC 0021/0022 the seed subsystem is replaced by `mode:` dispatch +
`converge apply`; the symptom classes can't recur. If a new spawn/apply
failure mode is found, append a fresh entry pointing at
`packages/core/src/task/spawn/apply.ts` or
`packages/core/src/navigator/core/actions/execution/run-{spawner,converger,gateway}.ts`.
-->
