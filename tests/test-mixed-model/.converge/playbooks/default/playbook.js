/**
 * Mixed-model playbook — one task per AI backend (Claude + Codex).
 */

export const meta = {
  name: "default",
  description: "Mixed-model playbook — one task per AI backend (Claude + Codex).",
};

export default async function flow({ parallel, task }) {
  await parallel([
    () => task("tasks/claude-hello/TASK.md"),
    () => task("tasks/codex-hello/TASK.md"),
  ]);
  return { done: true };
}
