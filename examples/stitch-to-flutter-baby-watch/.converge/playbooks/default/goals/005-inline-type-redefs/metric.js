// Counts files with inline class/typedef redefinitions of model types.

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export async function run(ctx) {
  const modelsDir = join(ctx.projectDir, 'lib/models');
  if (!existsSync(modelsDir)) return 0;

  // Discover model class names
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

  if (modelNames.length === 0) return 0;

  // Check screens and widgets for redefinitions
  let count = 0;
  for (const name of modelNames) {
    try {
      const output = execSync(
        `grep -rl "class ${name} " lib/screens/ lib/widgets/ 2>/dev/null || true`,
        { cwd: ctx.projectDir, encoding: 'utf-8' }
      );
      count += output.trim().split('\n').filter(Boolean).length;
    } catch {
      // skip
    }
  }

  return count;
}
