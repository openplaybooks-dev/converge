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

Implemented as a new zero-dep package `@converge/project-root` exporting one function `findConvergeRoot(startDir)`. Migrated every call site:

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

## Shared seed script path not found despite file existing at project root

*(Historical note: originally diagnosed for the WBS subsystem, which has since been replaced by the seed/navigator architecture. The path-resolution pattern is still relevant.)*

**Symptom**
- A TASK.md or seed template references a shared script at the project root.
- Run fails with a "script not found" error.
- The script exists at `<projectDir>/scripts/foo.js` but the runner only looks under the journal task directory.
- Error shows a resolved path inside `journal/<playbook>/tasks/...` instead of the project root.

**Root cause**
- The seed script executor resolved the script path only against the task materialization directory. That works for co-located scripts (e.g. `./seeds/index.js` next to the TASK.md) but breaks for shared scripts at the project root.

**Fix**
- Two-step resolution in the seed executor:
  1. Try task-dir-relative first (preserves the co-located convention).
  2. If that doesn't exist, fall back to project-dir-relative.
  3. The "not found" error message now lists *both* candidate paths so debugging is unambiguous.
- Mirror the same project-dir fallback in the repair path (`core/src/navigator/core/actions/repair/strategy-seed-script-repair.ts`) so the repair pipeline can also locate shared scripts.

**Verification**
```bash
cd /Users/minh/Documents/converge
pnpm --filter @converge/core build && pnpm --filter @converge/cli build
cd examples/test-seeding
node /Users/minh/Documents/converge/packages/cli/dist/index.js clean --select '*'
node /Users/minh/Documents/converge/packages/cli/dist/index.js run
# expect: seed script found and executed, no "script not found" errors
```

**Files touched**
- `packages/core/src/navigator/core/actions/resolution/resolve-seed.ts` (seed script resolution)
- `packages/core/src/navigator/core/actions/repair/strategy-seed-script-repair.ts` (repair path)

---

## Transient remote errors (429, 5xx, network) trigger seed script repair, wasting tokens

**Symptom**
- A seed script runs, hits a transient downstream failure (rate limit, quota exhausted, 5xx, network reset), and exits non-zero. Stdout shows the error, e.g.:
  ```
  google.genai.errors.ClientError: 429 RESOURCE_EXHAUSTED. {'error': {'message': 'Your prepayment credits are depleted...'}}
  ```
- Runner classifies this as a script bug and triggers repair, calling AI to "fix" the script:
  ```
  → Strategy: seed script error - triggering AI repair
  [seed-script-repair] Calling AI to fix script (attempt 1)...
  ```
- AI rewrites a script that wasn't broken, costing tokens for no benefit. Even if the rewrite is syntactically valid, the next run hits the same 429.

**Root cause**
- The seed repair path had no precondition to detect transient/remote failures. Every non-success exit path fed into AI repair.

**Fix**
- Added a transient-error precondition:
  - `TRANSIENT_REMOTE_PATTERNS` regex list matches 429, 5xx (502/503/504), `RESOURCE_EXHAUSTED`, `quota`, `rate-limit`, `Overloaded`, `ECONNRESET`/`ECONNREFUSED`/`ETIMEDOUT`/`ENOTFOUND`, "credits depleted", etc.
  - `isTransientRemoteError(error)` checks `error.name + message + stack` against those patterns.
  - Before the AI-repair branch, the executor logs a `skip-transient` fact and returns early when transient. The script's normal retry loop (1/2, 2/2) still applies; we just don't rewrite the script.

**Verification**
```bash
cd /Users/minh/Documents/converge
pnpm --filter @converge/core build && pnpm --filter @converge/cli build
cd examples/test-seeding
# Use a depleted/invalid API key to deterministically force a 429
GEMINI_API_KEY=invalid node /Users/minh/Documents/converge/packages/cli/dist/index.js clean --select '*'
GEMINI_API_KEY=invalid node /Users/minh/Documents/converge/packages/cli/dist/index.js run
# expect: log line showing transient error detected and AI repair skipped
# expect: NO "[seed-script-repair] Calling AI to fix script" line
```

**Files touched**
- `packages/core/src/navigator/core/actions/repair/strategy-seed-script-repair.ts` (transient error pre-filter)

---

## `seedConfigGap is not defined` crash in resolve-seed action

**Symptom**
- Running a playbook with a seed task that has a seed gap.
- Crash with `ReferenceError: seedConfigGap is not defined` at `resolveSeed`.
- Stack trace points to `resolve-seed.ts` (or the bundled `dist/index.js` equivalent).

**Root cause**
- `packages/core/src/navigator/core/actions/resolution/resolve-seed.ts` line 37 references `seedConfigGap.id` but the variable captured from the gap search (line 19) is named `seedGap`. The variable name `seedConfigGap` was never declared — a simple typo.

**Fix**
- Rename `seedConfigGap` → `seedGap` on the `gapId:` line in `resolve-seed.ts`.

**Verification**
- Run `examples/test-seed-repair`. Should not crash with `seedConfigGap is not defined`. Instead it should proceed to seed execution and (if the seed has a deliberate error) trigger repair.

**Files touched**
- `packages/core/src/navigator/core/actions/resolution/resolve-seed.ts`

---

## SeedScriptRepairStrategy can't find the seed file because `scriptPath` points to the task directory, not the script

**Symptom**
- Seed script execution fails with a runtime error (e.g., `ReferenceError`).
- Self-healing triggers seed-script-repair.
- Repair strategy fails: `Seed script not found at <task-dir>` (non-retryable).
- The seed script exists at `<seeds-dir>/<name>.seed.js` but the repair strategy only looks under the task directory.

**Root cause**
- `packages/core/src/executor/seed-executor.ts` "Strategy 4" (general seed error handler, ~line 1096) sets `scriptPath: this.taskFilePath` without trying to extract the actual script path from the error.
- The `extractWbsScriptPathFromError` method (line 1361) already knows how to parse the error format `"Seed script import failed: <path>\n<cause>"`, but it was only called in Strategy 2 (missing file), not Strategy 4 (general error).
- `packages/core/src/navigator/repair/strategies/seed-script-repair.ts` then searches for `seed.js`/`seedData.ts`/`seed/index.js` under the task directory, which doesn't contain the script (it's in `../seeds/`).

**Fix**
- In the Strategy 4 gap creation block, call `this.extractWbsScriptPathFromError(error)` first and use that as `scriptPath`, falling back to `this.taskFilePath` if extraction fails.

**Verification**
- Run `examples/test-seed-repair`. The repair strategy should find the seed script, call AI to fix it, self-test should pass, and the fixed script should re-run successfully.

**Files touched**
- `packages/core/src/executor/seed-executor.ts`
