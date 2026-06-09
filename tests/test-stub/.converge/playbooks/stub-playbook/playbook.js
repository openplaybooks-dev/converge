/**
 * RFC 0050 — a visible flow that runs this playbook's own TASK.md task.
 *
 * The single task under `tasks/stub-task/TASK.md` declares a `stub:` block in
 * its frontmatter. The flow invokes it through the real executor, which
 * honours the stub (no real side effects) and validates its `outputs:` +
 * `checks:`. The returned value is the task's `outputs` JSON.
 *
 * Run it:
 *   converge run stub-playbook
 *   converge run stub-playbook --resume
 */

export const meta = {
  name: "stub-playbook",
  description: "Stub mode test fixture — verifies stub: cmd execution",
  run: { mode: "oneoff" },
};

export default async function flow({ task }) {
  const report = await task("tasks/stub-task/TASK.md");
  return { done: true, report };
}
