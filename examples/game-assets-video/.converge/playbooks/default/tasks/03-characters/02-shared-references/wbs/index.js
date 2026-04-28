/**
 * WBS: Shared References
 *
 * Read character analysis and spawn tasks for shared references:
 * - Class style guides
 * - Shared effects
 * - Group assets
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PHASE = '03-characters/02-shared-references';
const WBS_ROOT = '.converge/playbooks/default/tasks/03-characters/02-shared-references/wbs/templates';
const ALLOWED_MODES = new Set(['characters', 'sprites', 'export', 'full']);

export async function run(ctx) {
  const { projectDir, vars } = ctx;
  const mode = vars?.stop_after ?? 'sprites';

  if (!ALLOWED_MODES.has(mode)) {
    console.log(`  Skipped (${PHASE}, stop_after=${mode})`);
    return;
  }

  const analysisPath = join(projectDir, '.converge', 'character-analysis.json');
  
  if (!existsSync(analysisPath)) {
    console.log('  No character analysis found. Run 03-character-analysis first.');
    return;
  }

  const analysis = JSON.parse(readFileSync(analysisPath, 'utf-8'));

  console.log(`  Spawning shared reference tasks\n`);

  let taskCount = 0;

  // Spawn class style guide tasks
  if (analysis.classes) {
    console.log(`  📚 Class Style Guides:`);
    
    for (const [className, classData] of Object.entries(analysis.classes)) {
      const taskId = `class-${className}`;
      const templatePath = `${WBS_ROOT}/class-style-guide/TASK.md`;
      const basePath = `.converge/playbooks/default/tasks/03-characters/02-shared-references/tasks`;

      const vars = {
        class_name: className,
        characters: JSON.stringify(classData.characters || []),
        shared_attributes: JSON.stringify(classData.shared_attributes || {}),
      };

      await ctx.spawn(
        { _type: 'template-ref', path: templatePath, vars },
        { id: taskId }
      );

      console.log(`    ✓ ${className} style guide`);
      taskCount++;
    }
  }

  // Spawn shared effect tasks
  if (analysis.shared_references) {
    console.log(`\n  ✨ Shared Effects:`);
    
    for (const ref of analysis.shared_references) {
      if (ref.type === 'shared_effect') {
        const taskId = `effect-${ref.name}`;
        const templatePath = `${WBS_ROOT}/shared-effect/TASK.md`;
        const basePath = `.converge/playbooks/default/tasks/03-characters/02-shared-references/tasks`;

        const vars = {
          effect_name: ref.name,
          effect_description: ref.description,
        };

        await ctx.spawn(
          { _type: 'template-ref', path: templatePath, vars },
          { id: taskId }
        );

        console.log(`    ✓ ${ref.name}`);
        taskCount++;
      }
    }
  }

  console.log(`\n  ✅ Spawned ${taskCount} shared reference task(s)`);
}

function existsSync(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}
