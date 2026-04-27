import { readFileSync } from 'fs';
import { join } from 'path';

const TEMPLATE_REL =
  '.converge/playbooks/default/tasks/03-references/wbs/templates/character/TASK.md';

export async function run(ctx) {
  const characters = JSON.parse(readFileSync(join(ctx.projectDir, 'assets/characters.json'), 'utf-8'));
  console.log(`  Spawning ${characters.length} character-ref task(s)`);
  for (const c of characters) {
    await ctx.spawn(
      { _type: 'template-ref', path: TEMPLATE_REL, vars: { id: c.id, cls: c.class } },
      { id: `ref-${c.id}` },
    );
    console.log(`    ✓ ref-${c.id}`);
  }
}
