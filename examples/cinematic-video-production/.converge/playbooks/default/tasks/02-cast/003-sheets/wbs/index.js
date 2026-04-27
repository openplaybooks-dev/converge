/**
 * WBS: Character Reference Sheets
 *
 * For each character in characters.json, spawn a parent task and 5 pipeline steps:
 *   01-visual-desc → 02-turnaround → 03-expressions → 04-wardrobe → 05-lock
 *
 * Character pipelines run in parallel with each other (independent characters).
 * Steps within a pipeline run sequentially (each depends on the prior).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const WBS_ROOT = '.converge/playbooks/default/tasks/02-cast/003-sheets/wbs/templates';

export async function run(ctx) {
  const { projectDir } = ctx;

  const charactersPath = join(projectDir, 'characters.json');
  const characters = JSON.parse(readFileSync(charactersPath, 'utf-8'));

  if (!characters.length) {
    console.log('  ⚠️  characters.json is empty — nothing to generate');
    return;
  }

  console.log(`  🎭 Spawning reference pipelines for ${characters.length} character(s)`);

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const prefix = String(i + 1).padStart(3, '0');
    const charTaskId = `${prefix}-${char.id}`;
    const charDir = `characters/${char.id}`;

    const charVars = {
      prefix,
      charId: char.id,
      charName: char.name,
      charRole: char.role,
      charAge: char.age || '',
      charBio: char.bio || '',
      charArc: char.arc || '',
      charVisualDescription: char.visual_description,
      charDir,
    };

    await ctx.spawn({
      id: charTaskId,
      title: `Character: ${char.name}`,
      dependencies: [],
      tags: ['character', 'reference-sheet'],
      vars: charVars,
      body: `Generate the complete reference sheet for ${char.name} (${char.role}).`,
    });

    const steps = ['01-visual-desc', '02-turnaround', '03-expressions', '04-wardrobe', '05-lock'];
    const templateBase = `${WBS_ROOT}/character`;

    for (const step of steps) {
      const id = `${prefix}-${step}`;
      const templatePath = `${templateBase}/tasks/${step}/TASK.md`;

      await ctx.spawn(
        { _type: 'template-ref', path: templatePath, vars: charVars },
        { id },
      );
    }
  }

  console.log(`  ✅ Spawned ${characters.length} character pipeline(s)`);
}
