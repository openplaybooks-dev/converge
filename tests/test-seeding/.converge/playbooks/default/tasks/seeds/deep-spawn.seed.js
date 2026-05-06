/**
 * Named seed: deep-spawn
 *
 * Used by spawned children (level 2) to seed level 3 grandchildren.
 * Each invocation spawns one grandchild task that creates a file.
 */
export async function run(ctx) {
  // Level 3 — grandchild: leaf task that creates grand.txt
  await ctx.spawn({
    id: "grandchild",
    title: "Create grand.txt",
    description: 'Level 3 leaf task — writes grand.txt with content "grand"',
    outputs: ["grand.txt"],
    checks: [
      {
        id: "grand-output",
        cmd: 'test -f grand.txt && grep -q "grand" grand.txt',
        description: "grand.txt exists with correct content",
      },
    ],
    prompt:
      "Create the file `grand.txt` with the exact content:\n\n```\ngrand\n```",
  });

  console.log(`  deep-spawn: created grandchild (level 3 leaf)`);
}
