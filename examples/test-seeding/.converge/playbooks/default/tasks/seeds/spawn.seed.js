/**
 * Named seed: spawn
 *
 * Used by the parent task via `type: seed, name: spawn`.
 * Spawns child-alpha (level 2) which itself is a seed task
 * that will spawn grandchild (level 3).
 * Also spawns child-beta as a simple leaf task.
 */
export async function run(ctx) {
  // Level 2 — child-alpha: a seed task that will spawn level 3
  await ctx.spawn({
    id: "child-alpha",
    title: "Seed: child-alpha → grandchild",
    description: "Level 2 seed task — spawns grandchild via deep-spawn seed",
    seeds: [
      {
        type: "nodejs",
        path: ".converge/playbooks/default/tasks/seeds/deep-spawn.seed.js",
      },
    ],
    checks: [
      {
        id: "grandchild-output",
        cmd: "test -f grand.txt && grep -q 'grand' grand.txt",
        description: "grand.txt exists with correct content (created by grandchild)",
      },
    ],
    prompt:
      "This is a level-2 seed task. Your seed script spawns grandchild which creates grand.txt. Do NOT create any files yourself.",
  });

  // Level 2 — child-beta: simple leaf task (no seed)
  await ctx.spawn({
    id: "child-beta",
    title: "Create beta.txt",
    description: 'Write beta.txt with content "beta"',
    outputs: ["beta.txt"],
    checks: [
      {
        id: "beta-output",
        cmd: 'test -f beta.txt && grep -q "beta" beta.txt',
        description: "beta.txt exists with correct content",
      },
    ],
    prompt:
      "Create the file `beta.txt` with the exact content:\n\n```\nbeta\n```",
  });

  console.log(`  spawn: created 2 children (child-alpha → seed, child-beta → leaf)`);
}
