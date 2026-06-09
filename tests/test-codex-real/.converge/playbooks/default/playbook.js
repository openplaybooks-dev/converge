/**
 * Real playbook test — runs a simple task with Codex (OpenAI CLI) as the
 * AI backend, including skill loading.
 *
 * RFC 0050 code-first flow for the test-codex-real fixture. The two
 * static tasks (`hello` then `skill-load`) chain in declaration order;
 * `skill-load` consumes `READY.txt` produced by `hello`, so it cannot
 * run in parallel.
 */

export const meta = {
  name: "default",
  description: "Real playbook test — runs a simple task with Codex (OpenAI CLI) as the AI backend, including skill loading.",
};

export default async function flow({ task }) {
  // Step 1: write READY.txt containing "codex-ready".
  await task("tasks/hello/TASK.md");

  // Step 2: load .agents via the hello-checker skill and write SKILL_LOADED.txt.
  // Depends on hello having produced READY.txt.
  await task("tasks/skill-load/TASK.md");

  return { done: true };
}
