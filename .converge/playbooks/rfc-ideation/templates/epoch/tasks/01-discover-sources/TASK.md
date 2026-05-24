---
id: "{{taskId}}"
title: "Discover candidate sources — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/discover/candidates.jsonl"
checks:
  - id: candidates-jsonl-valid
    cmd: "node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e '. != null' {{artifactsRel}}/discover/candidates.jsonl 2>/dev/null || test -s {{artifactsRel}}/discover/candidates.jsonl"
    description: Candidates JSONL is non-empty (or empty file marker present)
  - id: at-least-one-source-attempted
    cmd: "test -f {{artifactsRel}}/discover/sources-attempted.json"
    description: Each of the four source providers was attempted (success or empty)
---

# Discover candidate improvement sources

Gather candidates from all four sources into a single JSONL file. Each line
is a JSON object with the shape:

```json
{
  "source": "issue" | "idea" | "backlog" | "code-finding",
  "ref": "<issue#42 | path/to/idea.md | backlog-id | finding-hash>",
  "summary": "<one-line problem statement>",
  "body": "<full context the draft step needs>",
  "hash": "<sha1 of normalized problem statement, 8 chars>"
}
```

## Sources

### 1. Open GitHub issues

```sh
cd {{projectDir}}
gh issue list --state open --limit 50 --json number,title,body,labels \
  > /tmp/{{taskId}}-issues.json 2>/dev/null || echo "[]" > /tmp/{{taskId}}-issues.json
```

For each issue, emit one row with `source: "issue"`, `ref: "issue#<num>"`,
`summary: <title>`, `body: <body>`. Skip issues with label `wontfix`,
`duplicate`, or that already have a linked RFC (search
`docs/rfcs/*.md` for `source: issue#<num>`).

### 2. Idea files

```sh
ls {{projectDir}}/docs/ideas/*.md 2>/dev/null | grep -v README
```

For each idea file (excluding `README.md`), emit one row with
`source: "idea"`, `ref: "docs/ideas/<name>.md"`, body = file contents.
Skip idea files that have already been promoted (search `docs/rfcs/*.md`
for `source: idea:<path>`).

### 3. Backlog

```sh
test -s {{projectDir}}/.converge/artifacts/rfc-ideation/backlog.jsonl \
  && cat {{projectDir}}/.converge/artifacts/rfc-ideation/backlog.jsonl \
  || echo ""
```

Each backlog row records candidates that were deferred (dedup-skipped,
invalid, or stale-demoted). Emit rows with `source: "backlog"`,
`ref: <backlog item id>`.

### 4. Code-discovered findings

Pick ONE design principle from `CLAUDE.md` or `AGENTS.md` (e.g. "Checks,
Not Vibes", "Framework vs Project", "Source of Truth"), trace it through
`packages/core/src/` and `packages/cli/src/`, find a gap between the stated
principle and the actual code, and emit AT MOST ONE finding row with
`source: "code-finding"`, `ref: <finding-hash>`.

Every finding must be file:line specific. Examples:

- GOOD: "Principle X violated at `packages/core/src/run/index.ts:310`: `getTargetDir(projectDir, playbookName)` hardcodes the journal path convention"
- BAD: "Some files are too long" — no evidence, no file:line.

Skip cosmetic findings (formatting, unused imports). The finding must be
actionable as an RFC.

## Output

Write `{{artifactsRel}}/discover/candidates.jsonl` (one JSON object per line,
no trailing newline-only lines).

Write `{{artifactsRel}}/discover/sources-attempted.json`:

```json
{
  "issue": { "attempted": true, "count": <N>, "error": null },
  "idea": { "attempted": true, "count": <N>, "error": null },
  "backlog": { "attempted": true, "count": <N>, "error": null },
  "code-finding": { "attempted": true, "count": <N>, "error": null }
}
```

If a source genuinely has zero candidates (e.g. empty issue queue), record
`count: 0` and `error: null`. If a source fails (e.g. `gh` not authed),
record `error: "<message>"` and continue with the others.
