# Checks Reference

Full check reference for converge-planning. Read when you need to design deterministic checks for tasks, wire reusable helpers through `scripts/`, or plan convergence loops that rely on post-check evidence.

---

## Checks are part of the contract

Write checks during planning, not after. For every task contract, add checks that validate:
- the output exists
- the output is well-formed
- the output satisfies the actual task contract

Examples:

```yaml
checks:
  - id: file-exists
    cmd: test -f output.md
  - id: schema-valid
    cmd: jq empty data.json
  - id: section-present
    cmd: grep -q "## Required Section" output.md
```

Use checks at every level:
- Leaf task: its own outputs exist and are valid.
- Container task: child outputs are complete and internally consistent.
- Playbook: cross-task invariants still hold.

---

## Reusable helpers live in `scripts/`

There is no `.test.md` registry and no `checks/` folder. If a check needs shared logic, put the helper under the playbook's `scripts/` tree and call it directly from `cmd`.

```text
playbooks/default/
  scripts/
    file-exists.sh
    backend-configured.js
```

```yaml
checks:
  - id: idea-exists
    cmd: bash scripts/file-exists.sh idea.md
  - id: backend-configured
    cmd: node scripts/backend-configured.js image-generate
```

Rules:
- The command is the API. Keep it explicit.
- If a command references `scripts/...`, that file must actually exist.
- Do not rely on named test registries, `type: test`, or auto-discovered helper folders.

When to extract a helper into `scripts/`:
- the same command logic appears in multiple tasks
- the check needs real control flow or parsing
- the check needs a stable interface that several tasks can call

When not to extract:
- one-off shell checks
- tiny checks that stay readable inline

---

## Dynamic containers and post-check loops

For dynamic or adaptive parents, the checks should describe the real stop condition. The body does work and spawns children; the `converge` prompt decides whether another wave is needed after the checks run.

Typical shape:

```yaml
id: improve
passthrough: true
checks:
  - id: backlog-empty
    cmd: test ! -s artifacts/backlog.txt
  - id: report-valid
    cmd: node scripts/verify-report.js artifacts/report.json
converge: |
  Review the current evidence and decide whether to continue or halt.
```

The important split:
- body: gather evidence, write state, emit `<id>/spawn.yml` invocations under `$CONVERGE_SPAWN_DIR` (RFC 0024)
- checks: verify the current state
- `converge`: decide continue vs halt based on the checked evidence

That is the current self-correcting loop model.
