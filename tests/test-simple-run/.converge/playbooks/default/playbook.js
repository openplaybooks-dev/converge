/**
 * Simple playbook — one task, one attempt, clean convergence.
 *
 * RFC 0050 code-first flow for the test-simple-run fixture. The single
 * `hello` TASK.md is invoked through Converge's real executor; on resume
 * the step replays from the durable journal.
 */

export const meta = {
  name: "default",
  description: "Simple playbook — one task, one attempt, clean convergence.",
};

export default async function flow({ task }) {
  await task("tasks/hello/TASK.md");
  return { done: true };
}
