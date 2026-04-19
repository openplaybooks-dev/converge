// Single spawn task: Fix Dart Analysis Errors
// Spawns one task to fix all analysis errors.

export async function run(ctx) {
  const reportPath = ctx.goalReportPath;

  await ctx.spawn({
    id: '001-fix-dart-errors',
    title: 'Fix Dart Analysis Errors',
    body: `Fix all Dart analysis errors found in the project.

Read the report at \`${reportPath}\` for the list of errors.

Fix errors in this order:
1. Missing imports
2. Type errors
3. Undefined names
4. Remaining errors

After fixing, verify with: \`dart analyze lib/\``,
    checks: [
      {
        id: 'dart-clean',
        cmd: 'dart analyze lib/ 2>&1 | grep -c "error" | grep -q "^0$"',
        description: 'No Dart analysis errors',
      },
    ],
  });
}
