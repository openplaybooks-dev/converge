---
title: Mission control PRD
outputs:
  - PRD.md
checks:
  - id: prd-exists
    cmd: "test -s PRD.md"
    description: PRD.md exists and is non-empty
  - id: prd-sections
    cmd: "grep -qE '^## Goals' PRD.md && grep -qE '^## Users' PRD.md && grep -qE '^## Views' PRD.md && grep -qE '^## Acceptance' PRD.md"
    description: PRD contains the required top-level sections
---

# Mission control PRD

**Goal**: Define what mission control is, who uses it, and the views that ship — anchored to the real CLI surface so "parity" is measurable.

## Scope

Read `cli-commands.json` (produced by sibling `00-cli-inventory`). Group commands into user journeys (planning, execution, monitoring, journal browsing, playbook management). Write `PRD.md` covering goals, non-goals, users, views, a command-coverage table, and acceptance criteria.

**Inputs**:
- `cli-commands.json` (sibling output from `00-cli-inventory`, available at the working-directory root when this task runs)

**Outputs**:
- `PRD.md`

## Instructions

1. Load `cli-commands.json` from the current working directory using `Read` (or `node -e "console.log(JSON.stringify(require('./cli-commands.json'),null,2))"` if you need to inspect it from the shell). Confirm shape `{ "commands": [ { "name", "args", "options", "description", "examples" } ] }` and capture every `commands[].name` — you will need the full list for the coverage table in step 3.
2. Group the commands by domain so the views section maps to user journeys. Suggested groupings (adjust to whatever the manifest actually contains):
   - `plan*` → planning
   - `run*` → execution
   - `journal*`, `log*` → monitoring
   - `playbook*` → playbook management
   - everything else → catch-all "Other / Maintenance"
   Record the grouping in a small in-memory table; you will reuse it in `## Views` and `## Command Coverage`.
3. Write `PRD.md` to the current working directory using `Write`. The file MUST contain at least the following top-level sections, in this order, each preceded by `## ` exactly so the `prd-sections` check passes:
   - `## Goals` — what mission control achieves (1–5 bullet points). Anchor at least one goal to "feature parity with the converge CLI as enumerated in `cli-commands.json`."
   - `## Non-Goals` — what is explicitly out of scope for v1 (e.g. multi-workspace, auth, remote deployment — call these out so downstream architecture/backend/frontend nodes do not accidentally build them).
   - `## Users` — who uses this (personas + their primary tasks).
   - `## Views` — top-level navigation areas of the UI, derived from the domain grouping in step 2. Each view should name (a) which domain it covers and (b) which `cli-commands.json` entries surface inside it.
   - `## Command Coverage` — a markdown table with one row per entry in `cli-commands.json` `.commands[]`. Required columns: `Command`, `Description`, `View`, `Notes`. THIS TABLE IS THE PARITY CONTRACT: every command in the manifest must appear in exactly one row; no orphans, no duplicates. If a command intentionally has no UI in v1, list it here with `View = (deferred)` and a justification in `Notes` (and ensure `## Non-Goals` mentions the deferral).
   - `## Acceptance` — a deterministic checklist demonstrating parity. Each item must be checkable by inspection of the eventual UI or by a script. Include at minimum: "Every row in `## Command Coverage` resolves to a reachable UI route or an explicit `(deferred)` marker," and "Long-running commands surface live output in their view."
4. Open questions to resolve while drafting (record decisions in the PRD, do not leave them dangling):
   - Workspace scope: does mission control manage exactly one converge workspace (the cwd) or list/switch between several? (Default to single-workspace for v1 unless the parent prompt indicated otherwise; document the choice in `## Non-Goals` if multi-workspace is excluded.)
   - Auth: assume local-only and unauthenticated for v1 — call this out in `## Non-Goals`.
   - Destructive commands: state in `## Goals` or `## Non-Goals` whether destructive/maintenance commands (clear journal, reset state) are in scope for v1, and reflect the decision in the coverage table.
5. Before finishing, re-run the coverage check yourself: count the entries in `cli-commands.json` `.commands[]` and count the data rows in your `## Command Coverage` table — they must match. If they do not, fix the PRD until they do.
6. Verify the deterministic checks locally before declaring done:
   - `test -s PRD.md`
   - `grep -qE '^## Goals' PRD.md && grep -qE '^## Users' PRD.md && grep -qE '^## Views' PRD.md && grep -qE '^## Acceptance' PRD.md`

## Notes / Gaps

- The parent contract did not provide a check that asserts the coverage table is exhaustive. Step 5 of the instructions enforces this by hand; if a future iteration of this task wants a deterministic guard, add a check that diffs `jq -r '.commands[].name' cli-commands.json | sort` against the command names parsed out of the `## Command Coverage` table.
