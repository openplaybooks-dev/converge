import { readFileSync } from 'fs';
import { join } from 'path';

const TEMPLATE_REL =
  '.converge/playbooks/default/tasks/06-meshy-rig/wbs/templates/rig/TASK.md';

export async function run(ctx) {
  const characters = JSON.parse(readFileSync(join(ctx.projectDir, 'assets/characters.json'), 'utf-8'));
  const humanoids = characters.filter(c => c.humanoid);
  console.log(`  Spawning ${humanoids.length} rig task(s) (skipping ${characters.length - humanoids.length} non-humanoids)`);
  for (const c of humanoids) {
    await ctx.spawn(
      { _type: 'template-ref', path: TEMPLATE_REL, vars: { id: c.id } },
      { id: `rig-${c.id}` },
    );
    console.log(`    ✓ rig-${c.id}`);
  }
}
