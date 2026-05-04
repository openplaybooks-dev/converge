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