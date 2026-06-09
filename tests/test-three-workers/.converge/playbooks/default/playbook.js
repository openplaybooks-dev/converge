/**
 * Three independent roots plus one dependent task. Used to validate 3-worker
 * scheduling. The three roots fan out in parallel under a 3-worker budget;
 * 04-aggregate then waits on 01-alpha before running.
 */

export const meta = {
  name: "default",
  description: "Three independent roots plus one dependent task. Used to validate 3-worker scheduling.",
  run: { workers: 3, maxTaskAttempts: 1 },
};

export default async function flow({ task, parallel }) {
  // Three independent root tasks run concurrently within the 3-worker budget.
  await parallel([
    () => task("tasks/01-alpha/TASK.md"),
    () => task("tasks/02-beta/TASK.md"),
    () => task("tasks/03-gamma/TASK.md"),
  ]);

  // Aggregate waits on alpha (its `depends_on:`) and runs alone.
  await task("tasks/04-aggregate/TASK.md");

  return { done: true };
}
