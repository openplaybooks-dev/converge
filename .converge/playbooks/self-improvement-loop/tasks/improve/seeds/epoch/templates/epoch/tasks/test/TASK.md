---
id: "{{taskId}}"
title: "Test — epoch {{epoch}}"
checks:
  - id: test-report-written
    cmd: "test -f {{artifactsDir}}/test/report.md"
    description: "Test report exists"
---

# Run and analyze a framework test

Pick a test from the project, run it, and analyze the results for bugs, unexpected behavior, and journal structure issues.

## Pick a test

1. List `{{projectDir}}/tests/` — choose one test directory that hasn't been run recently (check the shared journal at `{{projectDir}}/.converge/artifacts/self-improvement-loop/journal.md` for previously tested ones)
2. Prefer test directories that have a `.converge/playbooks/` subdirectory (these are converge framework tests)

## Run

Run the test using the converge CLI:

```sh
cd {{projectDir}} && node packages/cli/dist/index.js run --dir={{projectDir}}/tests/<chosen-test>
```

If the test directory has multiple playbooks, pick the `default` one:
```sh
cd {{projectDir}} && node packages/cli/dist/index.js run --playbook=default --dir={{projectDir}}/tests/<chosen-test>
```

Capture the full output (stdout + stderr).

## Analyze

Examine the run output for:

1. **Errors** — any stack traces, failed tasks, exceptions, unexpected exits
2. **Journal structure** — check `tests/<test>/.converge/journal/` for manifest.json, runstate.json consistency
3. **Unexpected behavior** — tasks that should have run but didn't, tasks that ran but shouldn't have, wrong execution order
4. **Check failures** — which checks failed and why
5. **Seed issues** — seeds that spawned wrong children, missing templates, path errors

## Output

Write `{{artifactsDir}}/test/report.md`:

```markdown
# Test Report — Epoch {{epoch}}

## Test
- **Directory:** `tests/<name>`
- **Playbook:** <name>
- **Result:** PASSED | FAILED

## Run output
```
<paste relevant stdout/stderr excerpts>
```

## Issues found

### 1. <issue title>
- **Severity:** bug | warning | observation
- **Location:** `packages/<path>/<file>.ts`
- **What happened:** <description>
- **Expected:** <what should have happened>
- **Root cause:** <analysis>

## Journal structure
- manifest.json: OK | ISSUES
- runstate.json: OK | ISSUES
- Any inconsistencies found

## Recommendation
Pick the single most impactful issue to fix. Focus on framework bugs (packages/) over test configuration issues.
```
