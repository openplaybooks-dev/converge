/**
 * Tests buggy-check relaxation — agent proposes a corrected check via
 * BUGGY_CHECK.md, framework validates and applies it. RFC 0050 code-first
 * flow for the test-buggy-check fixture.
 */

export const meta = {
  name: "default",
  description: "Tests buggy-check relaxation — agent proposes corrected check via BUGGY_CHECK.md, framework validates and applies it.",
};

export default async function flow({ task }) {
  await task("tasks/buggy/TASK.md");
  return { done: true };
}
