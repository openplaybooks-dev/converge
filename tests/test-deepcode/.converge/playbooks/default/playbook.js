/**
 * DeepCode smoke playbook — code-first flow (RFC 0050).
 *
 * Replaces the legacy playbook.yml + tasks/deepcode-hello/TASK.md pair.
 * Chains the static task via `task("tasks/.../TASK.md")` so the same on-disk
 * TASK.md (its `outputs:` / `checks:`) is the source of truth.
 */

export const meta = {
  name: "default",
  description: "DeepCode smoke playbook.",
};

export default async function flow({ task }) {
  await task("tasks/deepcode-hello/TASK.md");
  return { done: true };
}
