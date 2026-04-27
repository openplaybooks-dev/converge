import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TEMPLATE_REL =
  '.converge/playbooks/default/tasks/02-class-guides/wbs/templates/class/TASK.md';

export async function run(ctx) {
  const { projectDir } = ctx;
  const charPath = join(projectDir, 'assets', 'characters.json');
  if (!existsSync(charPath)) {
    console.log('  characters.json not found — run 01-design first.');
    return;
  }
  const characters = JSON.parse(readFileSync(charPath, 'utf-8'));
  const classes = [...new Set(characters.map(c => c.class))];
  console.log(`  Spawning ${classes.length} class-guide task(s): ${classes.join(', ')}`);
  for (const cls of classes) {
    await ctx.spawn(
      { _type: 'template-ref', path: TEMPLATE_REL, vars: { cls } },
      { id: `class-${cls}` },
    );
    console.log(`    ✓ class-${cls}`);
  }
}
