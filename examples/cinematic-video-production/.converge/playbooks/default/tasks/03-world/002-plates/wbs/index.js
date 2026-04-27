/**
 * WBS: Location Reference Plates
 *
 * For each location in locations.json, spawn a parent task and 5 pipeline steps:
 *   01-description → 02-wide-plate → 03-detail-plates → 04-time-variants → 05-lock
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const WBS_ROOT = '.converge/playbooks/default/tasks/03-world/002-plates/wbs/templates';

export async function run(ctx) {
  const { projectDir } = ctx;

  const locationsPath = join(projectDir, 'locations.json');
  const locations = JSON.parse(readFileSync(locationsPath, 'utf-8'));

  if (!locations.length) {
    console.log('  ⚠️  locations.json is empty — nothing to generate');
    return;
  }

  console.log(`  🏛️  Spawning plate pipelines for ${locations.length} location(s)`);

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const prefix = String(i + 1).padStart(3, '0');
    const locTaskId = `${prefix}-${loc.id}`;
    const locDir = `locations/${loc.id}`;

    const locVars = {
      prefix,
      locId: loc.id,
      locName: loc.name,
      locDescription: loc.description,
      locTimeVariants: JSON.stringify(loc.time_variants),
      locProps: JSON.stringify(loc.props || []),
      locDir,
    };

    await ctx.spawn({
      id: locTaskId,
      title: `Location: ${loc.name}`,
      dependencies: [],
      tags: ['location', 'plate'],
      vars: locVars,
      body: `Generate reference plates for ${loc.name}.`,
    });

    const steps = ['01-description', '02-wide-plate', '03-detail-plates', '04-time-variants', '05-lock'];
    const templateBase = `${WBS_ROOT}/location`;

    for (const step of steps) {
      const id = `${prefix}-${step}`;
      const templatePath = `${templateBase}/tasks/${step}/TASK.md`;

      await ctx.spawn(
        { _type: 'template-ref', path: templatePath, vars: locVars },
        { id },
      );
    }
  }

  console.log(`  ✅ Spawned ${locations.length} location pipeline(s)`);
}
