/**
 * RFC 0050 — a visible flow that runs this playbook's own TASK.md tasks.
 *
 * The tasks under `tasks/<id>/TASK.md` were copied from the hello-world
 * example. `task("01-create-greeting")` resolves the on-disk TASK.md (its
 * `outputs:` and `checks:` come from the frontmatter) and executes it through
 * Converge's real engine — skill/agent, output validation, checks. The
 * returned value is the task's `outputs` JSON, which we chain into the next.
 *
 * Run it (needs an AI provider, e.g. ANTHROPIC_API_KEY for the claude CLI):
 *   converge run default
 *   converge run default --resume     # completed steps replay from steps.jsonl
 *
 * State lives in .converge/journal/default/steps.jsonl — the durable, resumable
 * mid-flight checkpoint. Kill the run halfway and `--resume`: finished tasks
 * replay, the rest continue.
 *
 * See the `demo` playbook for an LLM-free, fully hermetic resume demonstration.
 */

export const meta = {
  name: "default",
  description: "Chain this playbook's TASK.md tasks as a visible flow.",
  phases: [{ title: "Greet" }, { title: "Render" }],
};

export default async function flow({ phase, log, task }) {
  phase("Greet");
  const greeting = await task("01-create-greeting");
  log("greeting.json produced");

  phase("Render");
  const hello = await task("02-render-hello", { greeting });

  return { done: true, greeting, hello };
}
