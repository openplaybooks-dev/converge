/**
 * RFC 0050 code-first flow for the round-trip fixture.
 *
 * Three linear tasks (a → b → c) with `depends_on` chaining preserved
 * as a top-to-bottom imperative call sequence.
 */

export const meta = {
  name: "round-trip",
  description: "Three tasks in a linear chain, JS executors.",
};

export default async function flow({ task }) {
  await task("tasks/a/TASK.md");
  await task("tasks/b/TASK.md");
  await task("tasks/c/TASK.md");
  return { done: true };
}
