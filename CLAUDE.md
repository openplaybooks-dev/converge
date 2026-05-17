# CLAUDE.md

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

## 4. Goal-Driven Execution

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

## 5. Commit Convention

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

## 6. Converge Implementation Rules

These rules apply to all framework/playbook work:

- **Blueprint vs runtime:** `.converge/playbooks/` is source blueprint; `.converge/journal/` is executable run state/evidence. Fix source or loader/compiler behavior; do not hand-edit `manifest.json` or `runstate.json`.
- **Task discovery:** anything under `tasks/` with `TASK.md` may become executable. Keep reusable seed templates outside `tasks/` (for example `templates/`) unless they should run.
- **Contracts:** TASK.md `outputs:` and `checks:` define done. Do not weaken checks to pass. A cached task is only valid if declared outputs still exist.
- **Framework stays generic:** no project-specific paths, skills, asset names, or domain concepts in `packages/`; put those in playbooks/examples.
- **Production fixes need evidence:** prefer one focused change with a regression check. Preserve determinism for DAG discovery, `--select`, spawned children, resume, retries, locks, and cleanup.
- **Source of truth:** do not edit generated `dist/`; change source and build. Do not hide type errors with `any`, `as any`, `@ts-ignore`, or broad catch-and-ignore.
