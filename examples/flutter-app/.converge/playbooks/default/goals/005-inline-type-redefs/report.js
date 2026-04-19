// Reports inline type redefinitions in screens and widgets.

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export async function run(ctx) {
  const modelsDir = join(ctx.projectDir, 'lib/models');
  if (!existsSync(modelsDir)) {
    return { detail: 'No models directory found.', data: { byFile: {} } };
  }

  const modelFiles = readdirSync(modelsDir)
    .filter(f => f.endsWith('.dart') && !f.endsWith('.g.dart') && !f.endsWith('.freezed.dart'));

  const modelNames = [];
  for (const file of modelFiles) {
    const content = readFileSync(join(modelsDir, file), 'utf-8');
    const classes = content.match(/class (\w+)/g) || [];
    for (const cls of classes) {
      const name = cls.replace('class ', '');
      if (!name.startsWith('_')) modelNames.push(name);
    }
  }

  const byFile = {};
  for (const name of modelNames) {
    try {
      const output = execSync(
        `grep -rn "class ${name} " lib/screens/ lib/widgets/ 2>/dev/null || true`,
        { cwd: ctx.projectDir, encoding: 'utf-8' }
      );
      for (const line of output.trim().split('\n').filter(Boolean)) {
        const match = line.match(/^(.+?):(\d+):(.+)$/);
        if (match) {
          const [, file, lineNum, content] = match;
          if (!byFile[file]) byFile[file] = [];
          byFile[file].push({ line: parseInt(lineNum), type: name, content: content.trim() });
        }
      }
    } catch {
      // skip
    }
  }

  const detail = Object.entries(byFile)
    .map(([file, items]) =>
      `### ${file}\n${items.map(i => `  - Line ${i.line}: \`${i.type}\` redefined`).join('\n')}`
    )
    .join('\n\n');

  return {
    detail: `## Inline Type Redefinitions\n\n${detail || 'None found.'}`,
    data: { byFile },
  };
}
