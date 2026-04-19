// Counts .dart widget files not imported by any other file.

import { execSync } from 'child_process';

export async function run(ctx) {
  let allFiles;
  try {
    allFiles = execSync(
      "find lib/screens lib/widgets -name '*.dart' -not -name '*.g.dart' -not -name '*.freezed.dart' 2>/dev/null || true",
      { cwd: ctx.projectDir, encoding: 'utf-8' }
    ).trim().split('\n').filter(Boolean);
  } catch {
    return 0;
  }

  let dead = 0;
  for (const file of allFiles) {
    // Extract the filename without extension for import matching
    const basename = file.split('/').pop().replace('.dart', '');

    try {
      // Check if any other file imports this one
      execSync(
        `grep -rlq "${basename}" lib/ --include='*.dart' 2>/dev/null | grep -v "${file}" | head -1`,
        { cwd: ctx.projectDir }
      );
    } catch {
      dead++;
    }
  }

  return dead;
}
