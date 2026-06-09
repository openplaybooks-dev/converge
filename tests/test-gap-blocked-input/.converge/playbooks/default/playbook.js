/**
 * RFC 0050 — code-first flow for the gap-blocked-input fixture.
 *
 * Two-task DAG: producer must create INPUT_FILE.txt before consumer can read
 * it. On the first attempt the producer creates the wrong file, leaving the
 * consumer blocked; DependencyBackoffStrategy re-runs the producer to unblock.
 *
 * Run it:
 *   converge run default
 */

export const meta = {
  name: "default",
  description:
    "Two-task DAG — producer must create INPUT_FILE.txt before consumer can run. Producer fails on attempt 1, creating a blocker gap for the consumer. DependencyBackoffStrategy re-runs the producer to unblock.",
};

export default async function flow({ task }) {
  await task("tasks/producer/TASK.md");
  await task("tasks/consumer/TASK.md");
  return { done: true };
}
