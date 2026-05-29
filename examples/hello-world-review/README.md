# Hello World Review

Like `hello-world`, but with a **human review gate**. One task produces a JSON deliverable and an HTML preview; the runner pauses and waits for you to approve (or request changes) in the Studio. Reject → next attempt, with your feedback in the agent's context.

## What it demonstrates

- A `review:` block on a leaf task — pauses execution after outputs and checks succeed, no `mode: gateway` required.
- The preview that the human reads is an artifact the producer task writes itself (HTML, Tailwind via CDN), surfaced inline in the Studio's task detail panel.
- The approve / request-changes loop drives **next attempts**: rejecting the review re-runs the task body up to `maxTaskAttempts` times with the reviewer's feedback in context.

## Setup

Same as `examples/hello-world` — uses Claude Code with Anthropic OAuth by default. `claude login` once and you're done.

For other auth combos see [the hello-world README](../hello-world/README.md#setup).

## Run

From this directory:

```bash
scripts/run.sh           # wipe journal + state, then run
scripts/run.sh --hard    # also wipe output/ (full fresh run)
```

The agent will write `output/greeting.json` and `output/greeting.preview.html`, then the runner will pause. **Open the Studio:**

```
http://localhost:3002/playbooks/default
```

In the **Tasks** tab click `01-greet`. The detail drawer's **Artifacts** section lists both files; click `greeting.preview.html` to open the modal and inspect the rendered card. Then:

- **Approve** → the task transitions to `pass`, the run completes.
- **Request changes** with a note (e.g. *"use Vietnamese instead"*) → the task re-attempts. The agent rewrites both files addressing your feedback; the runner pauses again on the refreshed preview.

After `maxTaskAttempts` (5 by default) rejections in a row, the task halts with a `human-review-revise` reason.

## Outputs

- `output/greeting.json` — `{ name, language, timestamp }` (the deliverable)
- `output/greeting.preview.html` — Tailwind-styled card showing the greeting (the review artifact)

## Structure

```
.
├── scripts/
│   ├── clean.sh
│   └── run.sh
└── .converge/
    ├── project.yaml
    └── playbooks/default/
        ├── playbook.yml
        └── tasks/
            └── 01-greet/TASK.md
```
