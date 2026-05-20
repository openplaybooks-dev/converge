---
rfc: 0029
title: Empty / missing declared-input warning
status: draft
type: feat
source: human
priority_tier: tier3
estimate: "1 day"
backwards_compatible: yes
risk: low
breaks_existing: no
---
# RFC 0029: Empty / missing declared-input warning

## Problem

A task's `inputs:` frontmatter declares files the task body / skill expects to read. The framework does not validate these — it doesn't check the files exist, doesn't check they're non-empty, doesn't pass that signal to the LLM.

Two failure modes observed in `mezon-bot-ai/.converge/playbooks/mezon-portal/templates/screen-01-spec/TASK.md` on 2026-05-20:

1. **Empty-after-substitution.** Template declared `inputs: - "{{specDoc}}"`. Every screen's `specDoc` var was empty string. Post-substitution, the input became `- ""`. The framework happily passed an empty path to the skill. The LLM saw an empty input slot in its prompt, had no anchor document, and produced a SPEC.md from generic prior — exactly what the playbook author was trying to prevent by *declaring* an input.

2. **Path-doesn't-exist.** A template referencing `docs/some-historical-doc.md` that was renamed but never updated in the template. Same outcome — the LLM proceeds without the input, the skill produces lower-quality output.

Neither case fails the run; both quietly degrade output quality. They cost nothing to detect.

## Proposal

At task-prepare time (after var substitution, before AI call), validate each declared input:

| Condition | Severity | Action |
|---|---|---|
| Path is empty string | warning | Skip the input; note in the prompt context that `<var>` was empty |
| Path doesn't exist | warning | Skip the input; note in the prompt context that `<path>` was missing |
| Path exists but is 0 bytes | info | Include it; note in the prompt context that it was empty |
| Path exists and non-empty | OK | Include normally |

The warning is surfaced two ways:

1. **Reporter event** for operators to see in the log.
2. **Prompt augmentation** so the LLM knows. E.g. the prompt's "Inputs" section gets a structured note:

   ```
   ## Inputs
   1. .stitch/inventory/screens/landing.jsonl — present (2576 bytes)
   2. DESIGN.md — present (45331 bytes)
   3. <removed> — declared input "{{specDoc}}" resolved to empty string; skipped.
   ```

Telling the LLM about missing inputs is more useful than hiding them: a good skill might handle the absence gracefully, but only if it knows the absence is intentional rather than an oversight.

### Opt-out

Some inputs are conditionally present (e.g. an optional snapshot bundle from RFC 0019). Per-input opt-out via a leading `?`:

```yaml
inputs:
  - ?.stitch/optional-snapshot.json   # may not exist; no warning
  - DESIGN.md                          # required; warn if missing
```

Default: required. The `?` prefix is consistent with TypeScript's optional-property syntax and gnu-getopt's optional-arg convention.

### Configurable strictness

For repos that want to fail fast on missing inputs:

```yaml
# playbook.yml
run:
  strict_inputs: true   # warning → error
```

Default: false. Most playbooks tolerate missing inputs (some skills genuinely don't need every declared input on every run); strict mode is opt-in.

## Composition with other RFCs

| RFC | Relationship |
|---|---|
| **0001 (cross-template var validator)** | 0001 catches variable-name mismatches at compile time; 0029 catches *value*-emptiness at run time. Complementary. |
| **0012 (doctor preflight)** | Static check at preflight: warn when a non-`?`-prefixed input is a literal that doesn't exist (no var to substitute, so we can check at compile time). Catches the rename-doc-but-not-template case. |
| **0009 (structured retry context)** | The repair loop should know which inputs were missing on the prior attempt, so it can either fix the input (if the file was supposed to exist) or update the template (if the input was wrong). The warning structure feeds 0009's context. |

## Code-level design

### Hook into task preparation

`packages/core/src/run/index.ts` or wherever inputs are gathered for the prompt. After var substitution:

```ts
for (const declaredInput of taskDef.inputs ?? []) {
  const optional = declaredInput.startsWith("?");
  const path = optional ? declaredInput.slice(1) : declaredInput;
  if (path === "") {
    warnings.push({ kind: "empty-input-path", original: declaredInput });
    continue;
  }
  const abs = join(projectDir, path);
  if (!existsSync(abs)) {
    if (optional) continue;
    warnings.push({ kind: "missing-input", path });
    continue;
  }
  const size = statSync(abs).size;
  if (size === 0) {
    notes.push({ kind: "empty-input-file", path });
  }
  resolvedInputs.push({ path, size });
}
```

Emit a single `kind: "log", level: "warn"` per task summarising the missing/empty inputs. Augment the prompt as described above.

### Strict mode

When `run.strict_inputs: true`, convert every `warning` to a fatal error before the AI call, with errorCode `missing-required-input`.

## Verification

1. **Unit**: input path resolves to empty string → warning event emitted, prompt note added.
2. **Unit**: input path doesn't exist, no `?` prefix → warning event; same with `?` prefix → no warning.
3. **Unit**: input exists at 0 bytes → info event, prompt notes "empty (0 bytes)".
4. **Unit**: `strict_inputs: true` + missing required input → fatal error, no AI call made.
5. **Integration**: `screen-01-spec` template fixture with empty `{{specDoc}}`. Assert prompt sent to LLM contains the structured note about the skipped input.

## Anti-goals

- **Not** validating input *content* beyond size 0. Content-aware validation belongs to skill bodies; the framework only checks existence and non-emptiness.
- **Not** failing the run by default. Inputs are sometimes optional in practice; warnings are the right default.
- **Not** auto-creating missing input files. Empty file vs missing file are different signals; we surface both, the author or skill decides.

## Why now

This is the lowest-priority of the four post-mortem RFCs (0026–0029). It's the cheapest to implement (~80 lines) and the lowest-impact (the LLM usually muddles through). But the cost is non-zero — a SPEC.md produced from generic prior because the per-screen anchor was empty is a degraded artefact that the next pipeline step might propagate. Worth catching at the input boundary.
