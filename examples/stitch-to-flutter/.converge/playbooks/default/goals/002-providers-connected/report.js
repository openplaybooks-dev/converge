// Reports provider usage across screens and widgets.

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export async function run(ctx) {
  const providersDir = join(ctx.projectDir, 'lib/providers');
  if (!existsSync(providersDir)) {
    return { detail: 'No providers directory found.', data: { issues: [] } };
  }

  const files = readdirSync(providersDir)
    .filter(f => f.endsWith('.dart') && !f.endsWith('.g.dart'));

  const issues = [];
  const lines = [];

  for (const file of files) {
    const content = readFileSync(join(providersDir, file), 'utf-8');
    const providerNames = content.match(/(\w+Provider)\b/g) || [];
    const uniqueNames = [...new Set(providerNames)];

    for (const name of uniqueNames) {
      let used = false;
      try {
        execSync(`grep -rq "${name}" lib/screens/ lib/widgets/ 2>/dev/null`, { cwd: ctx.projectDir });
        used = true;
      } catch {
        // not found
      }

      if (!used) {
        issues.push({ file, provider: name });
        lines.push(`  - ${name} (${file}) — NOT connected to any screen or widget`);
      } else {
        lines.push(`  - ${name} (${file}) — connected`);
      }
    }
  }

  const detail = `## Provider Usage Report\n\n${lines.join('\n')}`;
  return { detail, data: { issues } };
}
