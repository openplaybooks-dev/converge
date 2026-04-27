import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TEMPLATE_REL =
  '.converge/playbooks/default/tasks/10-prop-pipeline/wbs/templates/prop/TASK.md';

export async function run(ctx) {
  const propsPath = join(ctx.projectDir, 'assets/props.json');
  if (!existsSync(propsPath)) {
    console.log('  props.json not found — run 01-design first.');
    return;
  }
  const props = JSON.parse(readFileSync(propsPath, 'utf-8'));
  if (!props.length) {
    console.log('  props.json is empty — no props declared in idea.md.');
    return;
  }
  console.log(`  Spawning ${props.length} prop pipeline task(s)`);
  for (const p of props) {
    await ctx.spawn(
      { _type: 'template-ref', path: TEMPLATE_REL, vars: { id: p.id } },
      { id: `prop-${p.id}` },
    );
    console.log(`    ✓ prop-${p.id}`);
  }
}
