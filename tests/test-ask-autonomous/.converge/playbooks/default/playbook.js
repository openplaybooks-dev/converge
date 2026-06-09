/**
 * Test playbook for AskUserQuestion autonomous auto-answer. RFC 0050
 * code-first flow for the test-ask-autonomous fixture. The single
 * `ask-task` TASK.md invokes the `ask-skill`, which carries an
 * "Ask first" block; the runner's autonomous auto-answer path is
 * exercised when that block fires.
 */

export const meta = {
  name: "default",
  description: "Test playbook for AskUserQuestion autonomous auto-answer.",
  run: { mode: "autonomous" },
};

export default async function flow({ task }) {
  await task("tasks/ask-task/TASK.md");
  return { done: true };
}
