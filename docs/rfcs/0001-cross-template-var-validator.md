---
rfc: 0001
title: Compile-time cross-template var validator
status: draft
type: fix
source: human
priority_tier: tier1
estimate: "1 day"
backwards_compatible: yes
risk: low
---
# RFC 0001: Compile-time cross-template var validator

## Problem

In a recent run of `examples/baby-app`, task `001-home-05-split` failed with:

```
seed failed: Template '.converge/playbooks/default/templates/screen-widget-split/TASK.md'
references undefined variable '{{widgetPath}}'. Available vars: screenId, screenTitle,
screenPath, widgetId, widgetName, widgetFile
```

The parent template emitted `--var widgetFile=...`, the child template declared `widgetPath` in its `vars:` block. Names mismatched. The bug only surfaced at runtime, after several hours of upstream work, after AI calls had already been billed.

This is a class of bug: any `converge spawn template --path X --var k=v` whose vars do not match the target template's declared `vars:` will fail at runtime.

## Current behaviour

`packages/core/src/validation/rules/playbook.ts:586` ships a rule `template-vars-consistent` that walks every TASK.md and checks `{{var}}` references in *its own* body match its own `vars:` declaration. It does **not** check the cross-task contract — that callers pass every required var to callees.

The runtime check that does catch the mismatch lives in the template renderer (the source of the error message above), but only when the template is loaded — which happens during the seed step of the parent task.

## Proposal

Add a new structural rule `spawn-vars-match-target-template` that:

1. Walks every TASK.md with `seed: { mode: cli }`.
2. For each fenced ` ```bash ` body, extracts every literal `converge spawn template --path X --id Y --var k=v` substring it would emit. (Heuristic — see Heuristic notes below.)
3. For each extracted spawn:
   - Resolves `--path X` to a template TASK.md.
   - Parses the target's `vars:` frontmatter.
   - Compares the emitted `--var` keys to the declared `vars:` keys.
   - Emits a `warning` if any declared var is not passed, `warning` if extra vars are passed (might shadow defaults).
4. Allows opting out per-task with `dynamic: true` in the seed frontmatter (for genuinely dynamic emitters whose vars are not statically determinable).

## Heuristic notes

The validator must be conservative — false positives are worse than false negatives because they block compile. Three tiers of static analysis:

1. **Trivial**: `converge spawn template --path "<literal>" --var "k=v"` where every arg is a literal string. Full check.
2. **Variable-substituted**: `--var "k=${VAR}"` where `VAR` is set in the same bash block. Treat as "key `k` is provided"; don't validate the value.
3. **Loop-driven**: `--var "k=${ITEM}"` inside a `for` loop. Same treatment — key is provided.

When the validator cannot statically determine that a key is provided (e.g., dynamic arg construction), it should emit a `info`-level note "could not statically verify spawn at line L; consider `dynamic: true`" rather than fail.

## Code-level design

```ts
// New file: packages/core/src/validation/rules/playbook-spawn-vars.ts

export const playbookSpawnVarsRules: PlaybookValidationRule[] = [
  {
    id: "spawn-vars-match-target-template",
    layer: "structure",
    severity: "warning",
    description: "Every converge spawn template emit provides the target template's required vars",
    check: ({ taskFiles, playbookRoot }) => {
      const issues: ValidationIssue[] = [];
      for (const taskPath of taskFiles) {
        const content = readTextFile(taskPath);
        const fm = parseFrontmatter(content);
        if (fm.seed?.mode !== "cli") continue;
        if (fm.dynamic === true) continue;
        const bashBlocks = extractFencedBashBlocks(content);
        for (const block of bashBlocks) {
          const spawns = extractStaticSpawns(block); // returns {path, vars: Set<string>, line}[]
          for (const spawn of spawns) {
            const tgtPath = resolvePath(playbookRoot, spawn.path);
            if (!existsSync(tgtPath)) {
              issues.push({ /* missing-target warning */ });
              continue;
            }
            const tgtVars = readDeclaredVars(tgtPath);
            for (const required of tgtVars) {
              if (!spawn.vars.has(required)) {
                issues.push({
                  ruleId: "spawn-vars-match-target-template",
                  layer: "structure",
                  severity: "warning",
                  message: `spawn at ${taskPath}:${spawn.line} omits "${required}" required by ${spawn.path}`,
                  path: taskPath,
                  field: "body",
                  fix: `Add --var "${required}=..." to the spawn line, or declare \`dynamic: true\` in this task's frontmatter`,
                });
              }
            }
          }
        }
      }
      return issues;
    },
  },
];
```

### `extractStaticSpawns` shape

Returns an array of `{ path, varKeys, lineInBlock }` from a bash block string. Implementation:

1. Split by lines.
2. For each line matching `^[ \t]*converge spawn template`, parse it through a simplified arg-tokenizer that:
   - Strips quotes.
   - For `${VAR}` or `$VAR`, treats it as a literal-but-unknown value (the *key* before `=` is what we need).
   - Bails out (returns `null` for that spawn) if it can't make sense of the line, with a captured-position-and-reason for the info issue.
3. Returns the static spawns it could parse, ignores ones it couldn't.

### Updated `vars:` parsing

`readDeclaredVars(taskPath)` reads frontmatter and returns the set of var names. If a value is `null`/empty, it's still required (the template body has a `{{var}}` placeholder). If marked `optional: true` (new convention), it's optional. The validator only enforces required keys.

## Migration

- Backwards-compatible. New rule defaults to `warning` severity. Existing playbooks may emit new warnings but still compile.
- Add a `strict: true` flag in `playbook.yml` that elevates these warnings to errors. Recommended for production playbooks.

## Wiring

- Add the rules array to `packages/core/src/validation/rules/playbook.ts`'s `playbookStructureRules` export (or as a separate file imported into `allPlaybookRules`).
- Surface through `converge compile` (which already runs structural validation per `packages/core/src/validation/validate.ts`).

## Test plan

Add tests under `packages/core/src/validation/__tests__/`:

1. **Happy path**: parent task emits all vars target needs → no warnings.
2. **Missing var**: parent omits one of target's required vars → warning emitted at correct line.
3. **Extra var**: parent passes a var the target doesn't declare → warning (lower severity).
4. **Dynamic loop**: bash for-loop dynamically constructs `--var "k=${ITEM}"` → key is recognized as provided.
5. **Dynamic opt-out**: parent has `dynamic: true` → no warning regardless.
6. **Unresolvable spawn**: a `--path "$DYNAMIC"` → info-level note, no error.
7. **Missing target**: `--path` points to a non-existent template → warning.

Reference real failures: extract the `widgetPath` vs `widgetFile` mismatch from baby-app's pre-fix state as a regression fixture.

## Examples to update

None initially — the new rule is opt-in via severity escalation. After 1-2 weeks of warnings, raise severity to `error` in a follow-up PR and audit examples.

## Out of scope

- Validating var **values** (only checks key presence).
- Running the bash to enumerate spawns dynamically (too dangerous; static-only).
- Cross-playbook validation (templates in different playbooks).
