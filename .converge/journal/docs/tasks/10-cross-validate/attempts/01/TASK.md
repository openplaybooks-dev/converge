# Task: 10-cross-validate

# Cross-validate

The contract: every claim in every doc page about framework behavior must
match what the code actually does. This phase is the enforcement.

## Two passes

### Pass 1 — mechanical (validate-docs.mjs)

Already runs as a check. Verifies:
- Every page has a `sources:` field.
- Every source path exists on disk.
- Pages aren't suspiciously empty (<200 chars).
- (Warning only) Pages whose declared sources have been modified after the
  page was written.

### Pass 2 — semantic (this task body)

For each doc page under `docs/` (excluding `_internal/`, `_*.json`, `index.md`):

1. Read the page's `sources:` from frontmatter.
2. Read each source file.
3. Re-derive what the page *should* say from the source.
4. Compare to what the page *does* say.
5. Record findings in `docs/_validation-report.json`:

```json
{
  "$schema": "./_validation-report.schema.json",
  "validatedAt": "<ISO>",
  "totalPages": <number>,
  "verified": <number>,
  "missingSources": [],
  "staleClaims": [
    {
      "page": "docs/reference/cli/run.md",
      "source": "packages/cli/src/commands-run.ts",
      "claim": "documents --filter flag",
      "actual": "the handler reads `options.filter` and calls TaskManager",
      "discrepancy": "page mentions --target flag which is not in handler"
    }
  ],
  "warnings": [
    {
      "page": "docs/concepts/gap-driven-model.md",
      "warning": "references Gap class but packages/core/src/index.ts doesn't export it (now lives at internal path)"
    }
  ]
}
```

6. **If staleClaims is non-empty**, fix the doc page. The source is canonical.

## Process

1. Run `node .converge/playbooks/docs/scripts/validate-docs.mjs` for the
   mechanical pre-flight. Fix any missing-source or empty-page issues.

2. Walk every `docs/**/*.md` (excluding `_internal/`, `index.md`, top-level
   `_*.json`). For each:
   - Parse the frontmatter, extract `sources:`.
   - Read each source.
   - **Sample claims** — pick 3-5 specific assertions (a CLI flag, a config
     field, a function name, a behavior). Verify each against the source.
   - Record in the report.

   Per-section sampling priorities:
   - **`docs/examples/**`** — verify the playbook phase list and "how to
     run" commands against `examples/<slug>/.converge/playbooks/*/playbook.yml`.
     The most common drift is renamed phases.
   - **`docs/troubleshooting/**`** — verify the symptom text matches
     verbatim against `skills/converge-control/troubleshooting/playbook.md`.
     The most common drift is paraphrased symptom text that no longer
     matches what the user sees.
   - **`docs/reference/cli/**`** — verify documented flags exist in the
     handler file the page declares.
   - **`docs/reference/<schema>.md`** — verify field names against the
     schema file.
   - **`docs/guides/**`** — verify any anchor example reference matches
     `docs/_examples.json`.

3. For every entry in `staleClaims`, edit the offending doc page to bring
   it back into alignment with the source.

4. Re-run after fixes. The terminal state is `staleClaims: []`.

## Banned

- Marking a claim "verified" without actually reading the source.
- Updating the *source* to match a wrong doc claim. Source is canonical here.
- Suppressing claims you can't verify cheaply. If you're not sure, flag it
  in `warnings` and pick a different claim to verify deeply.