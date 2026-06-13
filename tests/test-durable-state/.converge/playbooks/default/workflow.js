/**
 * RFC 0051 — durable, resume-safe flow state (ctx.state / useState).
 *
 * Three passthrough tasks run in sequence. As each runs, the flow records into
 * ctx.state:
 *   - a per-task duration   (metadata)   — state.set("<id>.duration_ms", …)
 *   - a running note        (log)        — state.update("notes", …)
 *   - a durable counter     (useState)   — [count, setCount] = useState("tasks_run")
 *   - a running total       (accumulate) — state.set("total", …)
 *
 * Why this matters: state is DURABLE and RESUME-SAFE. Kill the run halfway and
 * `--resume` — the completed tasks replay from the journal AND the state writes
 * re-apply in order, so the accumulated notes/total/counter come back exactly
 * as they were. State lives in the INVENTORY layer (committed, authoritative —
 * not the ephemeral journal):
 *   .converge/inventory/default/state.jsonl   # append-only event log
 *   .converge/inventory/default/state.json    # last-write-wins snapshot
 * which `converge inspect` / Studio / a human can read at any time.
 *
 *   converge run default            # runs the three tasks, builds up state
 *   converge run default --resume   # tasks replay; state re-applies identically
 *   cat .converge/inventory/default/state.json
 *
 * Tasks are passthrough (bash), so this runs offline — no AI provider needed.
 */

export const meta = {
  name: "default",
  description: "Record durations, notes, a counter, and a total into durable state.",
  phases: [{ title: "Run" }, { title: "Summarize" }],
};

export default async function flow({ phase, log, task, state, useState, now }) {
  phase("Run");

  let total = 0;
  for (const id of ["01-ingest", "02-transform", "03-load"]) {
    const start = now(); // journaled clock — deterministic across replays
    const out = await task(id); // passthrough → { n: <int> }

    state.set(`${id}.duration_ms`, now() - start); // per-task metadata
    state.update("notes", (ns) => [...ns, `${id} → n=${out.n}`], []); // running notes

    const [count, setCount] = useState("tasks_run", 0); // durable counter
    setCount(count + 1);

    total += out.n;
    state.set("total", total); // accumulated total
  }

  phase("Summarize");
  log(`durable state: ${JSON.stringify(state.all())}`);
  return state.all();
}
