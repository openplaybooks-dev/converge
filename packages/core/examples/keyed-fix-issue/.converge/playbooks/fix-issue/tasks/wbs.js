/**
 * WBS: Fix-Issue Pipeline Generator
 *
 * Generates a task pipeline for each issue:
 *   001-investigate → 002-implement → 003-verify → 004-commit
 *
 * This is a keyed playbook — each `--issue=N` spawns a fresh set of tasks.
 * The pipeline is the same shape every time, but the content is specific
 * to the issue number.
 */

export async function run(ctx) {
  const issue = ctx.vars?.issue;
  if (!issue) {
    throw new Error("Missing required input: issue");
  }

  // Phase 1: Investigate
  await ctx.spawn({
    id: "001-investigate",
    title: `Investigate issue #${issue}`,
    outputs: [`.converge/fix-${issue}/analysis.json`],
    body: `Read and understand issue #${issue}.

1. Reproduce the bug
2. Explore the relevant code
3. Identify the root cause
4. Write findings to \`.converge/fix-${issue}/analysis.json\`:

\`\`\`json
{
  "issue": "${issue}",
  "summary": "One-line description",
  "root_cause": "What's wrong and why",
  "files": [
    { "path": "src/foo.ts", "action": "modify", "description": "What to change" }
  ]
}
\`\`\`

Do NOT fix anything yet.`,
  });

  // Phase 2: Implement
  await ctx.spawn({
    id: "002-implement",
    title: `Implement fix for #${issue}`,
    dependencies: ["001-investigate"],
    inputs: [`.converge/fix-${issue}/analysis.json`],
    body: `Read \`.converge/fix-${issue}/analysis.json\` and implement the fix.

Rules:
- Surgical changes only — touch nothing unrelated
- Match existing code style
- Add or update tests that cover the fix`,
  });

  // Phase 3: Verify
  await ctx.spawn({
    id: "003-verify",
    title: `Verify fix for #${issue}`,
    dependencies: ["002-implement"],
    checks: [{ id: "tests-pass", cmd: "npm test" }],
    body: `Run the test suite and verify issue #${issue} is fixed.
If tests fail, diagnose and fix before proceeding.`,
  });

  // Phase 4: Commit
  await ctx.spawn({
    id: "004-commit",
    title: `Commit fix for #${issue}`,
    dependencies: ["003-verify"],
    body: `Create a git commit:
1. Stage only changed files
2. Message: \`fix: <description> (#${issue})\`
3. Do NOT push`,
  });
}
