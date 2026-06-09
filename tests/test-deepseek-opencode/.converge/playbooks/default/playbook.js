/**
 * DeepSeek + Opencode smoke playbook — code-first flow (RFC 0050).
 *
 * Replaces the legacy playbook.yml + tasks/<id>/TASK.md pair. The two
 * sibling static tasks (deepseek-hello, opencode-hello) are independent —
 * the original YAML relied on RFC 0034 auto-chaining; here we fan them
 * out explicitly via `parallel` so order is unambiguous.
 */

export const meta = {
  name: "default",
  description: "DeepSeek + Opencode smoke playbook — one task per backend.",
};

export default async function flow({ task, parallel }) {
  await parallel([
    () => task("tasks/deepseek-hello/TASK.md"),
    () => task("tasks/opencode-hello/TASK.md"),
  ]);
  return { done: true };
}
