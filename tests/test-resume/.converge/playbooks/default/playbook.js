/**
 * RFC 0050 — resume test flow.
 *
 * Single task (`long-task`) that takes multiple steps. Designed so a
 * mid-run kill leaves partial outputs (STEP-1.txt, STEP-2.txt) on disk;
 * a subsequent `converge run` with `--resume` re-runs the task, the
 * framework sees the declared outputs already exist, and the resume
 * story is exercised end-to-end.
 */

export const meta = {
  name: "default",
  description:
    "Resume test — task takes long enough to be killed mid-run. After kill, running again should resume and complete.",
};

export default async function flow({ task }) {
  await task("tasks/long-task/TASK.md");
  return { done: true };
}
