/**
 * WBS: Object Reference Sheets
 *
 * For each object in objects.json, spawn subtasks to generate
 * locked object reference sheets (objects/{id}/ref.png).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const { projectDir } = ctx;

  const objectsPath = join(projectDir, 'objects.json');
  const objects = JSON.parse(readFileSync(objectsPath, 'utf-8'));

  if (!objects.length) {
    console.log('  ⚠️  objects.json is empty — nothing to generate');
    return;
  }

  console.log(`  📦 Spawning reference pipelines for ${objects.length} object(s)`);

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const prefix = String(i + 1).padStart(3, '0');
    const objTaskId = `${prefix}-${obj.id}`;

    const vars = {
      objId: obj.id,
      objName: obj.name,
      objDescription: obj.description,
      objType: obj.type,
      states: JSON.stringify(obj.states || []),
    };

    await ctx.spawn({
      id: objTaskId,
      title: `Object: ${obj.name}`,
      dependencies: [],
      tags: ['object', 'reference-sheet'],
      vars,
      body: `Generate locked reference sheet for ${obj.name} (${obj.id}). Type: ${obj.type}.`,
    });

    console.log(`    - ${objTaskId}: ${obj.name}`);
  }

  console.log(`  ✅ Spawned ${objects.length} object pipeline(s)`);
}
