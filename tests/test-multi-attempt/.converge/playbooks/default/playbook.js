/**
 * RFC 0050 — visible flow for the multi-attempt fixture.
 *
 * Runs the single static task `two-phase` through Converge's real engine.
 * No fan-out, no runtime spawn — just a straight `await task(...)`.
 */

export const meta = {
  name: "default",
  description:
    "Multi-attempt playbook — the task must write a specific hash that the AI cannot guess, forcing at least 2 attempts.",
};

export default async function flow({ task }) {
  await task("tasks/two-phase/TASK.md");
  return { done: true };
}
