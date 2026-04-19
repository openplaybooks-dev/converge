// Finds hardcoded data arrays in screen files.

import { execSync } from 'child_process';

export async function run(ctx) {
  let output;
  try {
    output = execSync(
      "grep -rnE '^(final|const) [a-z].*= \\[' lib/screens/ 2>/dev/null || true",
      { cwd: ctx.projectDir, encoding: 'utf-8' }
    );
  } catch {
    return { detail: 'No hardcoded data found.', data: { byFile: {} } };
  }

  const lines = output.trim().split('\n').filter(Boolean);
  const byFile = {};

  for (const line of lines) {
    const match = line.match(/^(.+?):(\d+):(.+)$/);
    if (match) {
      const [, file, lineNum, content] = match;
      if (!byFile[file]) byFile[file] = [];
      byFile[file].push({ line: parseInt(lineNum), content: content.trim() });
    }
  }

  const detail = Object.entries(byFile)
    .map(([file, items]) =>
      `### ${file}\n${items.map(i => `  - Line ${i.line}: \`${i.content}\``).join('\n')}`
    )
    .join('\n\n');

  return { detail: `## Hardcoded Data Report\n\n${detail || 'None found.'}`, data: { byFile } };
}
