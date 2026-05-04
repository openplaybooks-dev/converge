/**
 * Deliberately broken seed.js
 *
 * BUG: The function parameter is named "context" but the body calls
 * "ctx.spawn()". This will throw ReferenceError: ctx is not defined.
 *
 * The SeedScriptRepairStrategy should diagnose this, fix the parameter name
 * to "ctx", and retry the fixed script.
 */
export async function run(context) {
  // BUG: using ctx.spawn() but parameter is named "context" not "ctx"
  // The AI should detect ReferenceError and rename parameter to "ctx"
  await ctx.spawn({
    id: "worker",
    title: "Create output file",
    description: "Creates OUTPUT.txt with 'done'",
    outputs: ["OUTPUT.txt"],
    checks: [
      {
        id: "output-check",
        cmd: "test -f OUTPUT.txt && grep -q 'done' OUTPUT.txt",
        description: "OUTPUT.txt exists with correct content",
      },
    ],
    prompt: "Create OUTPUT.txt with content 'done'.",
  });

  console.log("  broken-seed: spawned 1 child (worker)");
}
