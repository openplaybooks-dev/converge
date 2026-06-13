# Hello World — Flow (`workflow.js`)

The smallest **code-first flow**: a playbook's orchestration written as a visible, editable JavaScript program instead of hidden DAG wiring — and **resumable at any point mid-flight**.

It demonstrates RFC 0050's two headline ideas:

1. **A `workflow.js` is an optional override that coexists with `playbook.yml`.** The same `tasks/` run either way — the workflow just customizes *how* they're orchestrated.
2. **Durable replay.** Every step (`task(...)`/`agent(...)`) is a journaled checkpoint. Kill a run halfway, `--resume`, and finished steps replay instantly from disk while the rest continue.

The flow shape is **identical to a Claude Code workflow** (`.claude/workflows/*.js`): `export const meta` + a body using `phase`/`log`/`task`/`agent`/`parallel`/`pipeline`. The difference is what `task(...)` runs — a real Converge `TASK.md` with `outputs:` and `checks:`.

## Layout

```text
.converge/playbooks/
├── default/                 # coexist demo — ships BOTH files
│   ├── playbook.yml         #   the declarative default (DAG engine)
│   ├── workflow.js          #   the optional override (run uses this)
│   └── tasks/
│       ├── 01-create-greeting/TASK.md
│       └── 02-render-hello/TASK.md
└── demo/                    # LLM-free hermetic resume demo
    └── workflow.js          #   inline tasks, no AI provider needed
```

## The `default` playbook — coexist in action

The folder holds **both** `playbook.yml` and `workflow.js`, over the same two tasks.

```js
// .converge/playbooks/default/workflow.js
export const meta = {
  name: "default",
  phases: [{ title: "Greet" }, { title: "Render" }],
};

export default async function flow({ phase, log, task }) {
  phase("Greet");
  const greeting = await task("01-create-greeting"); // runs tasks/01-.../TASK.md
  log("greeting.json produced");

  phase("Render");
  const hello = await task("02-render-hello", { greeting }); // chain outputs forward

  return { done: true, greeting, hello };
}
```

`task("01-create-greeting")` resolves the on-disk `TASK.md`, runs it through Converge's real engine (skill/agent → `outputs:` validation → `checks:`), and returns its `outputs` JSON — which the next `task` consumes as `params`.

### The toggle

| Command | What runs | Why |
|---|---|---|
| `converge run default` | **`workflow.js`** | `run` prefers a workflow when one is present |
| `mv workflow.js workflow.off && converge run default` | **`playbook.yml`** | no workflow → the YAML default (DAG engine) |
| `converge compile default` / `inspect` | the `tasks/` DAG | compile/inspect always show the declarative graph |

Removing or renaming the workflow never loses anything — the same `tasks/` keep running by default. No YAML is ever required to be deleted.

```bash
cd examples/hello-world-flow

# needs an AI provider (e.g. ANTHROPIC_API_KEY for the claude CLI)
converge run default
converge run default --resume   # completed tasks replay from steps.jsonl

converge run default --dry      # print what each step would run, execute nothing
```

State lives in `.converge/journal/default/steps.jsonl` — the durable, resumable checkpoint.

## The `demo` playbook — resume, no AI needed

`demo` uses **inline tasks** (a `run:` function on the task spec) so it's fully hermetic. It's the clearest way to *see* mid-flight resume on disk: each step prints `EXEC <id>` only when it truly executes — on replay it stays silent because the result is served from the journal.

```bash
converge run demo                  # fresh run — prints EXEC for both steps
FAIL_RENDER=1 converge run demo    # crash after the greeting
converge run demo --resume         # greeting replays (silent), render runs (EXEC)
converge run demo --resume         # everything cached — zero EXEC lines
```

## How resume works

The flow re-executes top-to-bottom on every run. Each step is keyed by a deterministic fingerprint (id + params + contract version). Before running a step the runtime checks `steps.jsonl`:

- **Hit** → return the cached result instantly (no execution, no AI call).
- **Miss** → execute, then append the result.

So a resumed run **fast-forwards through the completed prefix** and continues exactly where it stopped. Editing a step changes its fingerprint, so only that step and everything downstream re-run.

## Learn more

- [Concept: Workflows](../../docs/concepts/workflow.md) — the full model and the two compatibility contracts (Claude workflow + Converge).
- [RFC 0050](../../docs/rfcs/0050-durable-code-first-runtime.md) — design and rationale.
