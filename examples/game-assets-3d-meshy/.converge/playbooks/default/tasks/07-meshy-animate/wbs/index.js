import { readFileSync } from 'fs';
import { join } from 'path';

const TEMPLATE_REL =
  '.converge/playbooks/default/tasks/07-meshy-animate/wbs/templates/animate/TASK.md';

export async function run(ctx) {
  const characters = JSON.parse(readFileSync(join(ctx.projectDir, 'assets/characters.json'), 'utf-8'));
  let count = 0;
  for (const c of characters.filter(x => x.humanoid)) {
    for (const action of c.animations) {
      await ctx.spawn(
        { _type: 'template-ref', path: TEMPLATE_REL, vars: { id: c.id, action } },
        { id: `anim-${c.id}-${action}` },
      );
      console.log(`    ✓ anim-${c.id}-${action}`);
      count++;
    }
  }
  console.log(`  Spawned ${count} animation task(s)`);
}
