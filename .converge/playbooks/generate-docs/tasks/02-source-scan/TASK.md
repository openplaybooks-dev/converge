---
id: 02-source-scan
title: Phase 02 — Scan source files; emit docs-sources.json + examples manifest
blocking: true
inputs:
  - packages
  - examples
  - skills/converge-control/troubleshooting/playbook.md
  - README.md
  - CHANGELOG.md
outputs:
  - docs/_sources.json
  - docs/_cli-commands.json
  - docs/_examples.json
checks:
  - id: sources-json-exists
    cmd: "test -f docs/_sources.json && node -e \"JSON.parse(require('fs').readFileSync('docs/_sources.json','utf8'))\""
    description: docs/_sources.json exists and is valid JSON
  - id: sources-json-has-cli
    cmd: "node -e \"const s=require('./docs/_sources.json');process.exit(Array.isArray(s.cli)&&s.cli.length>0?0:1)\""
    description: sources include CLI files
  - id: sources-json-has-core
    cmd: "node -e \"const s=require('./docs/_sources.json');process.exit(Array.isArray(s.core)&&s.core.length>0?0:1)\""
    description: sources include @converge/core files
  - id: sources-json-has-troubleshooting
    cmd: "node -e \"const s=require('./docs/_sources.json');process.exit(Array.isArray(s.troubleshooting)&&s.troubleshooting.length>0?0:1)\""
    description: sources include the troubleshooting reference file
  - id: cli-commands-extracted
    cmd: "test -f docs/_cli-commands.json && node -e \"const c=require('./docs/_cli-commands.json');process.exit(c.length>=10?0:1)\""
    description: at least 10 CLI commands extracted by scan-cli-commands.mjs
  - id: examples-manifest-exists
    cmd: "test -f docs/_examples.json && node -e \"const e=JSON.parse(require('fs').readFileSync('docs/_examples.json','utf8'));process.exit(Array.isArray(e)&&e.length>=15?0:1)\""
    description: docs/_examples.json lists at least 15 examples with category and metadata
  - id: examples-have-required-fields
    cmd: "node -e \"const e=JSON.parse(require('fs').readFileSync('./docs/_examples.json','utf8'));const ok=e.every(x=>x.slug&&x.category&&typeof x.hasReadme==='boolean'&&typeof x.hasPlaybook==='boolean');process.exit(ok?0:1)\""
    description: every examples entry has slug, category, hasReadme, hasPlaybook
---

# Source scan

Build a structured map of every source file later phases can derive doc
content from. The output is the *cross-validation universe* — every `sources:`
frontmatter field in any doc page must reference a file in this map.

This phase also produces `docs/_examples.json` — the data file the Examples
Gallery WBS (`05-examples`) consumes to spawn one task per example.

## Process

### 1. CLI command seed list

```bash
node .converge/playbooks/docs/scripts/scan-cli-commands.mjs docs/_cli-commands.json
```

Pattern-matches `case "<cmd>":` blocks in `packages/cli/src/main.ts` and
maps each to its handler file. Best-effort — the CLI uses ad-hoc parsing,
so the list may include aliases or miss handlers. The `08-reference` phase
refines this by reading each handler file directly.

### 2. Examples manifest (docs/_examples.json)

For each subdirectory of `examples/`:

```json
[
  {
    "slug": "hello-world",
    "title": "Hello World",
    "category": "learning",
    "hasReadme": true,
    "hasPlaybook": true,
    "readmePath": "examples/hello-world/README.md",
    "playbookPath": "examples/hello-world/.converge/playbooks/default/playbook.yml",
    "tagline": "Simplest possible Converge playbook. Creates a file and verifies it exists.",
    "complexity": "trivial"
  }
]
```

Field rules:

- `slug` — directory name under `examples/`. Skip non-directory entries
  (e.g. `context-chain-demo.ts`).
- `title` — first `# ` heading from the example's README. If no README, fall
  back to a title-cased version of `slug`.
- `category` — assign one of these (best-fit; document edge cases in the body):
  - `learning` — beginner-friendly, single-concept (`hello-world`,
    `data-pipeline`, `acp-demo`, `baby-app`).
  - `software` — building runnable software (`flutter-app`, `fullstack-app`,
    `stitch-to-flutter*`, `game-aiwolf`, `game-assets`,
    `godot-game-asset-pipeline`).
  - `research` — multi-pass deep research / analysis
    (`deep-research`, `frontier-research`, `deep-regulatory-research`,
    `enterprise-contract-compliance`, `scientific-research`).
  - `creative` — creative output / simulation
    (`cinematic-video-production`, `social-sim`,
    `evolutionary-optimization`).
  - `security` — security work (`autonomous-pentest`).
  - `agent-protocol` — protocol / SDK demo (`acp-demo`). Note: also fits
    `learning`. Prefer `agent-protocol` for now since this category is small.
- `hasReadme` — boolean. `examples/<slug>/README.md` exists.
- `hasPlaybook` — boolean. *Any* `playbook.yml` exists under `examples/<slug>/`.
- `readmePath` — relative path to the README, or `null`.
- `playbookPath` — relative path to the *primary* playbook (typically
  `examples/<slug>/.converge/playbooks/default/playbook.yml`); `null` if
  none exists.
- `tagline` — first non-heading paragraph from the README, trimmed to <140
  chars; null if no README.
- `complexity` — one of `trivial | small | medium | large` based on number
  of phases in the playbook (0=trivial, 1-3=small, 4-7=medium, 8+=large).
  Use `null` if no playbook.

Walk with shell:

```bash
for dir in examples/*/; do
  name=$(basename "$dir")
  [ -d "$dir" ] || continue
  # build entry
done
```

Examples without a README **or** without a playbook still get an entry
(with `hasReadme: false` / `hasPlaybook: false`). The Examples Gallery
WBS will spawn a degraded page for them ("this example is undocumented;
here's the file tree").

### 3. Source manifest (docs/_sources.json)

Write `docs/_sources.json` with this shape:

```json
{
  "$schema": "./_sources.schema.json",
  "generatedAt": "<ISO timestamp>",
  "cli": [
    "packages/cli/src/main.ts",
    "packages/cli/src/commands.ts",
    "packages/cli/src/commands-run.ts",
    "..."
  ],
  "core": [
    "packages/core/src/index.ts",
    "packages/core/src/playbook/loader.ts",
    "packages/core/src/journal/types.ts",
    "..."
  ],
  "examples": [
    "examples/hello-world/.converge/playbooks/default/playbook.yml",
    "..."
  ],
  "schemas": [
    "packages/core/src/storage/types.ts",
    "packages/core/src/config/task-definition.ts",
    "..."
  ],
  "troubleshooting": [
    "skills/converge-control/troubleshooting/playbook.md"
  ],
  "topLevel": [
    "README.md",
    "CHANGELOG.md"
  ]
}
```

Walk the directories yourself with `find` / `git ls-files`:

```bash
git ls-files 'packages/cli/src/*.ts' | sort
git ls-files 'packages/core/src/**/*.ts' | sort | head -100
git ls-files 'examples/*/.converge/playbooks/*/playbook.yml' | sort
git ls-files 'examples/*/.converge/playbooks/*/playbook.yaml' | sort
```

### 4. Schema files

Identify the files that define the *schemas* the user interacts with —
typically zod or TypeScript interfaces for `playbook.yml`, `TASK.md`
frontmatter, and `project.yml`. These are the load-bearing files for
the `08-reference` schema pages. Common names:

- `packages/core/src/storage/types.ts` — `PlaybookConfigSchema`, `ProjectConfigSchema`
- `packages/core/src/config/task-definition.ts` — `TaskDefinition`, `TaskFrontmatterSchema`

Confirm by grep'ing for `Schema` or `defineSchema` in `packages/core/src/`.

## Banned

- Listing every TS file in `packages/core/src/`. The manifest is curated —
  only files a doc page might reasonably cite as a source. Internal helpers
  don't make the list.
- Hard-coding paths the scanner found that don't exist. Every entry must
  pass `test -f`.
- Skipping examples that don't have a README — they still get an entry
  with `hasReadme: false`. The gallery degrades gracefully.
- Editing source files. This is read-only.
