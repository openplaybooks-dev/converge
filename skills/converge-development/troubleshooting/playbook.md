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
- After running an example like `examples/autonomous-pentest`, the example's skills (e.g. `pentest-recon`, `pentest-probe-*`) appear as symlinks under `<repo-root>/.claude/skills/` instead of `examples/<name>/.claude/skills/`.
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
4. Per-package test counts unchanged from baseline (zero regressions): `agentfn` 56 pass / 18 fail (fixture-data related, pre-existing), `kimifn` 96 pass / 1 file fail (broken import, pre-existing), `geminifn` 29/29, `qwenfn` 29/29, `core` 431 pass (24 file failures vs 26 on baseline — slight improvement).
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

## Shared `wbs.path` not found despite file existing at project root

**Symptom**
- TASK.md declares `wbs: { type: shell, path: scripts/foo.py }` (a script at the project root, shared across many tasks).
- Run fails with:
  ```
  [wbs:...] ❌ WBS execution failed: WBS script not found: scripts/foo.py
  Resolved to: <projectDir>/.converge/journal/<playbook>/tasks/<task-path>/scripts/foo.py
  Task directory: <projectDir>/.converge/journal/<playbook>/tasks/<task-path>
  ```
- The script exists at `<projectDir>/scripts/foo.py` but the runner only looks under the materialized task directory.

**Root cause**
- `packages/core/src/executor/script-wbs-executor.ts` resolved `wbs.path` only against `taskDir` (`resolve(taskDir, wbsConfig.path)`). That works for the co-located convention (`./wbs/index.js` next to the TASK.md) but breaks for shared scripts at the project root that many WBS tasks need to call.

**Fix**
- Two-step resolution in `script-wbs-executor.ts`:
  1. Try `taskDir`-relative first (preserves the co-located convention).
  2. If that doesn't exist, fall back to `projectDir`-relative (`resolve(ctx.projectDir, wbsConfig.path)`).
  3. The "not found" error message now lists *both* candidate paths so debugging is unambiguous.
- Mirror the same project-dir fallback in `packages/core/src/navigator/repair/strategies/wbs-script-repair.ts` so the AI-repair path can also locate shared scripts (otherwise the repair pipeline reports "WBS script not found" even when the script ran fine and only the API call inside it failed).

**Verification**
```bash
cd /Users/minh/Documents/converge
pnpm --filter @converge/core build && pnpm --filter @converge/cli build
cd examples/game-assets   # has TASK.md templates with `wbs.path: scripts/...`
node /Users/minh/Documents/converge/packages/cli/dist/index.js reset default
node /Users/minh/Documents/converge/packages/cli/dist/index.js .converge/playbooks/default/playbook.yml run --max-iterations 250
# expect log line: "Executing WBS script: scripts/generate_character_angles.py (shell)"
# (previous behavior: "WBS script not found: scripts/generate_character_angles.py")
```

**Files touched**
- `packages/core/src/executor/script-wbs-executor.ts`
- `packages/core/src/navigator/repair/strategies/wbs-script-repair.ts`

---

## Transient remote errors (429, 5xx, network) trigger AI script repair, wasting tokens

**Symptom**
- A WBS shell/nodejs script runs, hits a transient downstream failure (rate limit, quota exhausted, 5xx, network reset), and exits non-zero. Stdout shows the error, e.g.:
  ```
  google.genai.errors.ClientError: 429 RESOURCE_EXHAUSTED. {'error': {'message': 'Your prepayment credits are depleted...'}}
  ```
- Runner classifies this as a script bug and triggers `wbs-script-repair`, which calls Anthropic to "fix" the script:
  ```
  → Strategy: WBS script error - triggering AI repair
  [wbs-script-repair] Calling AI to fix script (attempt 1)...
  ```
- AI rewrites a script that wasn't broken, costing tokens for no benefit. Even if the rewrite is syntactically valid, the next run hits the same 429.

**Root cause**
- `packages/core/src/executor/wbs-executor.ts::triggerSelfHealing` had no precondition to detect transient/remote failures. Every non-success exit path fed into Strategy 4 (AI repair).

**Fix**
- Added a transient-error precondition in `wbs-executor.ts`:
  - New `TRANSIENT_REMOTE_PATTERNS` regex list matches 429, 5xx (502/503/504), `RESOURCE_EXHAUSTED`, `quota`, `rate-limit`, `Overloaded`, `ECONNRESET`/`ECONNREFUSED`/`ETIMEDOUT`/`ENOTFOUND`, "credits depleted", etc.
  - New `isTransientRemoteError(error)` checks `error.name + message + stack` against those patterns.
  - In `triggerSelfHealing`, before the Strategy 4 AI-repair branch, the executor now logs a `skip-transient` self-healing fact and returns early when transient. The script's normal attempt loop (1/2, 2/2) still applies; we just don't rewrite the script.

**Verification**
```bash
cd /Users/minh/Documents/converge
pnpm --filter @converge/core build && pnpm --filter @converge/cli build
cd examples/game-assets
# Use a depleted/invalid Gemini key to deterministically force a 429
GEMINI_API_KEY=invalid node /Users/minh/Documents/converge/packages/cli/dist/index.js reset default
GEMINI_API_KEY=invalid node /Users/minh/Documents/converge/packages/cli/dist/index.js .converge/playbooks/default/playbook.yml run --max-iterations 250
# expect log line: "→ Skipping AI repair: transient/remote error (..."
# expect: NO `[wbs-script-repair] Calling AI to fix script` line
```

**Files touched**
- `packages/core/src/executor/wbs-executor.ts`
