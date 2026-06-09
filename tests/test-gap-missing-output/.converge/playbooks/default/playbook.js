/**
 * Tests output gap detection + TaskRunStrategy re-execution. The task declares
 * OUTPUT.txt but intentionally skips creating it on attempt 1, forcing the gap
 * detector to find a missing-output gap and re-run the task.
 *
 * RFC 0050 code-first flow for the test-gap-missing-output fixture.
 */

export const meta = {
  name: "default",
  description: "Tests output gap detection + TaskRunStrategy re-execution. The task declares OUTPUT.txt but intentionally skips creating it on attempt 1, forcing the gap detector to find a missing-output gap and re-run the task.",
};

export default async function flow({ task }) {
  await task("tasks/miss-out/TASK.md");
  return { done: true };
}
