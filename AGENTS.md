# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 3.5. Framework vs. Project — NEVER hardcode project specifics into the framework

**The framework (`packages/`) is generic. Projects (`examples/`) are specific.** Never let project-specific paths, skill names, asset names, or domain concepts leak into framework code.

| ❌ Hardcoded into framework | ✅ Generic |
|---|---|
| `skill: "image-generate"` in dag-run.ts | skill comes from playbook/task definition |
| `assets/concept/master/master.png` in framework | framework reads paths from task `inputs:` |
| `"grassland-${category}-${id}"` ID pattern | framework discovers children from catalog `id` fields |
| Token-specific prompt text in taskDef | taskDef comes from seed template TASK.md |

**When tempted to hardcode:** stop. The data already exists somewhere — in the playbook, in a TASK.md, in a catalog JSON, in a seed.json. Make the framework read it from there instead of baking it in.

**If you absolutely need project-specific behavior:** it goes in the project's `.converge/` directory (skills, playbooks, scripts), never in `packages/`.

## 4. RFC-First Workflow

**Write the RFC before writing code.** This is the default for any non-trivial feature or behavioral change.

1. **RFC document** — create `docs/rfcs/NNNN-short-title.md`. State the problem, proposed solution, migration path, and verification criteria.
2. **Tests first (TDD)** — write the test suite that defines expected behavior. Red → Green → Refactor.
3. **Implement** — make the minimal code changes to pass the tests.
4. **Verify** — `pnpm build` passes, `pnpm test` passes, no pre-existing failures introduced.
5. **Changelog** — add an entry to `CHANGELOG.md` under `[Unreleased]`, update the RFC Progress table.

Skip the RFC only for trivial tasks: typos, formatting, single-line fixes.

### RFC Status Lifecycle

Every RFC tracks its state in the frontmatter `status` field and in a **Progress** table near the top of the document. The lifecycle:

| Status | Meaning |
|---|---|
| `proposed` | RFC is written, not yet accepted. |
| `accepted` | Approved; work is in progress. |
| `done` | Implementation complete, tests passing, migration applied, changelog updated. |
| `rejected` | Decided against — kept for historical reference. |

### Progress Table

Add a **Progress** section immediately after the frontmatter in every RFC:

```markdown
## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Written and accepted |
| Tests (TDD) | **done** | All new + affected tests passing |
| <implementation item> | **done** / **skip** / **defer** | Brief note |
| `pnpm build` | **done** | TypeScript + DTS clean |
| Changelog entry | **done** | Added to CHANGELOG.md under [Unreleased] → <section> |
| Pre-existing failures | **skip** | Failing before this RFC |
```

Use **done** for completed items, **skip** for intentionally out-of-scope, and **defer** for future follow-ups.

## 5. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 6. Converge Implementation Rules

These rules apply to all framework/playbook work:

- **Three-layer data model:** see §6.1. The runner reads from `inventory/`. Inventory has two sync sources — `compile` (from `playbooks/`) and runtime `spawn` (from `journal/`). Never hand-edit inventory or journal files; fix the source or the loader/compiler.
- **Task discovery:** anything under `tasks/` with `TASK.md` may become executable. Keep reusable seed templates outside `tasks/` (for example `templates/`) unless they should run.
- **Contracts:** TASK.md `outputs:` and `checks:` define done. Do not weaken checks to pass. A cached task is only valid if declared outputs still exist.
- **Framework stays generic:** no project-specific paths, skills, asset names, or domain concepts in `packages/`; put those in playbooks/examples.
- **Production fixes need evidence:** prefer one focused change with a regression check. Preserve determinism for DAG discovery, `--select`, spawned children, resume, retries, locks, and cleanup.
- **Source of truth:** do not edit generated `dist/`; change source and build. Do not hide type errors with `any`, `as any`, `@ts-ignore`, or broad catch-and-ignore.

### 6.1 Data Model & Sync Flow

Converge has three on-disk layers under `.converge/<name>/`. The **inventory is the runtime source of truth**, fed by two incremental sync sources:

```
playbooks/<name>/                       (authored source)
  playbook.yml                          ─ static tasks
  tasks/<id>/TASK.md                    ─ author edits live here
  templates/<name>/TASK.md              ─ blueprints for runtime spawns
        │
        │ compile  ─ scan tasks/ for new dirs, append static rows
        ▼
┌─────────────────────────────────────────────────────────────┐
│ inventory/<name>/tasks.jsonl   ◄── runtime source of truth │
│   kind:"playbook" header                                    │
│   kind:"task" rows (source: "static" | "spawned")           │
└──────────────┬──────────────────────────────────▲───────────┘
               │ run  ─ build DAG from rows       │ spawn  ─ runtime tasks
               ▼                                  │ emit `converge spawn …`
        journal/<name>/                           │ which append new rows
          runstate.json, manifest.json   ────────┘
          tasks/<id>/attempts/...
```

**Layer roles:**

| Layer | Path | Role | Who writes it |
|---|---|---|---|
| **Playbook** | `playbooks/<name>/` | Author's source: `playbook.yml`, per-task `TASK.md`, and reusable `templates/` | Humans / agents |
| **Inventory** | `inventory/<name>/tasks.jsonl` | The runner's source of truth: one row per task with `taskRef` → source TASK.md or template | Framework, via `compile` (static) and runtime `spawn` (dynamic) |
| **Journal** | `journal/<name>/` | Execution evidence: runstate, manifest, attempts. Also emits spawn commands. | Framework, during `run` |

**Sync rules:**

- **Inventory has two incremental sync inputs:**
  - **`compile` (playbooks → inventory).** `converge compile` (and the implicit compile at the start of every `run`) scans `playbooks/<name>/tasks/<id>/TASK.md` and appends rows with `source: "static"` for ids not already in `tasks.jsonl`.
  - **Runtime `spawn` (journal → inventory).** Tasks running in the journal can emit `converge spawn …` commands (typically from a seed with `mode: cli`); each emission appends a row with `source: "spawned"` whose `taskRef` points at a `templates/<name>/` blueprint plus runtime `params`.
- **Sync is append-only.** Both paths preserve existing rows verbatim; neither rewrites, reorders, or trims. Spawned rows accumulate as the DAG expands.
- **Deletions don't propagate.** Removing a `tasks/<id>/` directory does NOT remove the inventory row (history is sacred). If you need to drop a task, also remove its inventory row explicitly via tooling, not by hand-editing.
- **Inventory is authoritative at runtime.** A TASK.md that doesn't appear in `tasks.jsonl` is invisible to the runner — even if the file exists on disk. Fix this by running compile (for static tasks) or by re-running the seed task that should have spawned it.
- **Never edit downstream to fix upstream symptoms.** If the journal looks wrong, the bug is in the loader, compiler, or source. If the inventory looks wrong, fix the playbook source / template, or the sync logic (`playbook-compile.ts` for static, the spawn pipeline for dynamic). Hand-editing `runstate.json` or `tasks.jsonl` is a code smell.

**Execution order:**

- Task ids follow the convention `NN-name` (`01-create-greeting`, `02-render-hello`, `03-render-html`). The numeric prefix is the authoring convention for natural sort order.
- The DAG executes by `depends_on` first; the numeric prefix is a tie-breaker and a reading aid.
- When inserting a task between existing ones, pick a number that reflects intent (`02b-...` or renumber). Don't rely on file-system listing order — it's an implementation detail.

**Human review verdicts:**

- A `review:` block on any task (task or gateway) holds the task as `awaiting-review` after execution succeeds. The runner stays alive and polls the verdict file at `inventory/<playbook>/reports/<taskId>.jsonl`.
- One writer API, two callers: `appendHumanReview()` in `packages/core/src/task/review.ts` is the only function that appends a verdict. The CLI command `converge review <id> --approve | --revise <note> | --reject <note>` and the Studio endpoint `POST /api/playbooks/<name>/tasks/<id>/review` both call it. Nothing else writes verdicts.
- Approval clears the gate and lets the runner proceed. `revise` / `reject` are recorded for the audit trail; for tasks they cause the body to re-attempt on the next pass with the feedback in context.
- The Studio is a pure extension: it can read the same JSONL files and post verdicts. The framework does not spawn or know about any UI server.

## 7. Commit Convention

**Format:** `type(scope): subject` — lowercase, imperative, no trailing period, soft-wrap title at 72 chars.

**Allowed types:** `feat` · `fix` · `chore` · `refactor` · `docs` · `test` · `perf` · `revert`.

**Scope** is the most useful path or domain — typical shapes:

- `core`, `cli`, `studio`, `claudefn` — package names under `packages/`
- `examples/<name>` — e.g. `examples/deep-research`
- `playbooks/<name>` — e.g. `playbooks/history-rewrite`
- `.converge`, `gitignore`, `readme` — top-level config
- omit scope for repo-wide changes (`docs: …`, `test: …`)

**Body** (use whenever the diff isn't self-explanatory):

- Blank line after subject.
- Wrap at ~80 chars. Explain **why**, not **what** — the diff already shows what.
- Use bullets for multiple distinct points; prose otherwise.
- If AI-assisted, end with the Co-Authored-By trailer:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

**Hygiene:**

- Stage **only** what your change touches. Inspect `git status` before adding — unstage pre-existing edits you didn't make (`git reset HEAD <path>`).
- Prefer one focused commit per concern. If framework code AND an example both changed, split them. A reader should be able to revert one without losing the other.
- Never amend a pushed commit; create a new one.
- Never use `--no-verify`, `--no-gpg-sign`, or `-c commit.gpgsign=false` unless the user explicitly asks.

**Good examples (from this repo):**

- `fix(core): survive 429 storms and ferry skill+vars through cli spawns`
- `feat(examples/deep-research): make publishable; flat 6-task chain per question folder`
- `chore(gitignore): ignore .converge runtime state directories`
- `docs(readme): expand integrations section`
