/**
 * Tests loop detection — agent repeatedly checks and tweaks the same file,
 * generating repeated tool-call signatures. The loop detector should append a
 * "Loop hint" to LEARN.md. RFC 0050 code-first flow for the test-loop-detection
 * fixture.
 */

export const meta = {
  name: "default",
  description:
    "Tests loop detection — agent repeatedly checks and tweaks the same file, generating repeated tool-call signatures. The loop detector should append a \"Loop hint\" to LEARN.md.",
};

export default async function flow({ task }) {
  await task("tasks/looper/TASK.md");
  return { done: true };
}
