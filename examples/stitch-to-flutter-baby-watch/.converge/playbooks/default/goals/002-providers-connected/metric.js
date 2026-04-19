// Counts providers NOT imported by any screen or widget.
// Discovers provider files from lib/providers/*.dart,
// extracts provider names, and checks grep for each in lib/screens/ and lib/widgets/.

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export async function run(ctx) {
  const providersDir = join(ctx.projectDir, 'lib/providers');
  if (!existsSync(providersDir)) return 0;

  const files = readdirSync(providersDir)
    .filter(f => f.endsWith('.dart') && !f.endsWith('.g.dart'));

  let disconnected = 0;
  for (const file of files) {
    const content = readFileSync(join(providersDir, file), 'utf-8');
    const providerNames = content.match(/(\w+Provider)\b/g) || [];
    const uniqueNames = [...new Set(providerNames)];

    for (const name of uniqueNames) {
      try {
        execSync(`grep -rq "${name}" lib/screens/ lib/widgets/ 2>/dev/null`, { cwd: ctx.projectDir });
      } catch {
        disconnected++;
      }
    }
  }

  return disconnected;
}
