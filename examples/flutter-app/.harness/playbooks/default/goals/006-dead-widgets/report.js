// Reports unused/dead widget files.

import { execSync } from 'child_process';

export async function run(ctx) {
  let allFiles;
  try {
    allFiles = execSync(
      "find lib/screens lib/widgets -name '*.dart' -not -name '*.g.dart' -not -name '*.freezed.dart' 2>/dev/null || true",
      { cwd: ctx.projectDir, encoding: 'utf-8' }
    ).trim().split('\n').filter(Boolean);
  } catch {
    return { detail: 'No widget files found.', data: { files: [], issues: [] } };
  }

  const issues = [];
  for (const file of allFiles) {
    const basename = file.split('/').pop().replace('.dart', '');

    let used = false;
    try {
      const result = execSync(
        `grep -rl "${basename}" lib/ --include='*.dart' 2>/dev/null || true`,
        { cwd: ctx.projectDir, encoding: 'utf-8' }
      );
      const importers = result.trim().split('\n').filter(f => f && f !== file);
      used = importers.length > 0;
    } catch {
      // not found
    }

    if (!used) {
      issues.push(file);
    }
  }

  const detail = issues.length
    ? `## Dead Widgets\n\n${issues.map(f => `- \`${f}\``).join('\n')}`
    : '## Dead Widgets\n\nNone found.';

  return { detail, data: { files: allFiles, issues } };
}
