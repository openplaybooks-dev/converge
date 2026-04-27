---
id: 002-redirects
title: Write docs/_redirects.json (legacy URL aliases)
inputs:
  - docs/_internal
outputs:
  - docs/_redirects.json
checks:
  - id: redirects-exists
    cmd: "test -f docs/_redirects.json && node -e \"JSON.parse(require('fs').readFileSync('docs/_redirects.json','utf8'))\""
    description: redirects manifest exists and is valid JSON
  - id: redirects-array
    cmd: "node -e \"const r=require('./docs/_redirects.json');process.exit(Array.isArray(r.redirects)?0:1)\""
    description: has a redirects array (possibly empty)
---

# Write `docs/_redirects.json`

Map old doc URLs (from before this playbook owned `docs/`) to their new
homes. The landing-page playbook reads this file when configuring
Cloudflare Pages redirects.

## File: `docs/_redirects.json`

```json
{
  "$schema": "./_redirects.schema.json",
  "redirects": [
    {
      "from": "/docs/getting-started.md",
      "to":   "/docs/getting-started/your-first-playbook",
      "code": 301
    },
    {
      "from": "/docs/why-converge.md",
      "to":   "/docs/getting-started/why-converge",
      "code": 301
    },
    {
      "from": "/docs/scaffolding.md",
      "to":   "/docs/guides/build-a-software-project",
      "code": 301
    },
    {
      "from": "/docs/comparisons.md",
      "to":   "/docs/concepts/gap-driven-model",
      "code": 301
    },
    {
      "from": "/docs/comparison-matrix.md",
      "to":   "/docs/concepts/gap-driven-model",
      "code": 301
    },
    {
      "from": "/docs/guides/writing-a-playbook",
      "to":   "/docs/guides/build-a-software-project",
      "code": 301
    },
    {
      "from": "/docs/guides/tasks-and-wbs",
      "to":   "/docs/reference/task-md",
      "code": 301
    },
    {
      "from": "/docs/guides/checks-and-gaps",
      "to":   "/docs/concepts/gap-driven-model",
      "code": 301
    },
    {
      "from": "/docs/guides/journals-and-learn",
      "to":   "/docs/guides/read-the-journal",
      "code": 301
    },
    {
      "from": "/docs/guides/switching-providers",
      "to":   "/docs/guides/switch-providers",
      "code": 301
    },
    {
      "from": "/docs/guides/debugging-stuck-runs",
      "to":   "/docs/troubleshooting/",
      "code": 301
    }
  ]
}
```

## Why these specific guide redirects

The previous Guides set was feature-shaped (`writing-a-playbook`,
`tasks-and-wbs`, `checks-and-gaps`, `journals-and-learn`,
`switching-providers`, `debugging-stuck-runs`). The new set is
problem-shaped. The redirect map preserves any inbound links to the
old URLs by routing them to their best new home:

- `writing-a-playbook` → `build-a-software-project` (the new "I want to
  ship a real playbook" entry point).
- `tasks-and-wbs` → `/reference/task-md` (the schema-level detail
  moved to Reference).
- `checks-and-gaps` → `/concepts/gap-driven-model` (the model is now
  in Concepts, with concrete check syntax in `/reference/task-md`).
- `journals-and-learn` → the renamed `read-the-journal` guide.
- `switching-providers` → the renamed `switch-providers` guide.
- `debugging-stuck-runs` → the new Troubleshooting hub.

## Process

1. List every file moved to `docs/_internal/` in `01-archive-existing` that
   may have had inbound links somewhere (GitHub READMEs, social posts,
   comments, the website pre-launch).
2. For each, decide the closest new equivalent and add a 301.
3. If a piece of content was internal-only and never had a public URL,
   don't add a redirect — it didn't have inbound links to preserve.

## Banned

- 302 (temporary) for permanent moves. Use 301.
- Redirecting to `/docs/_internal/*`. Internal docs aren't public.
- An empty array if there are obvious legacy paths to redirect. The whole
  point is preserving link integrity.
