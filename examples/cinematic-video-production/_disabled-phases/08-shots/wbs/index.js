/**
 * WBS: Shot Video Generation
 *
 * For each shot, spawn a parent task and 4-step pipeline:
 *   01-prompt → 02-generate → 03-qc → 04-regen-guard
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const WBS_ROOT = '.converge/playbooks/default/tasks/08-shots/wbs/templates';

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function run(ctx) {
  const { projectDir } = ctx;
  const shots = JSON.parse(readFileSync(join(projectDir, 'shots.json'), 'utf-8'));

  console.log(`  🎥 Spawning ${shots.length} shot video pipeline(s)`);

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const nnn = String(i + 1).padStart(3, '0');
    const actionSlug = slugify(shot.action);
    const clipSlug = `${nnn}-${shot.id}-${actionSlug}`;
    const clipDir = `clips/${clipSlug}`;

    const vars = {
      shotId: shot.id,
      clipSlug,
      clipDir,
      nnn,
      sceneId: shot.scene_id,
      shotType: shot.shot_type,
      cameraMove: shot.camera_move || 'static',
      lensMm: shot.lens_mm || 40,
      durationS: shot.duration_s,
      action: shot.action,
      mood: shot.mood || '',
      charactersInFrame: JSON.stringify(shot.character_ids_in_frame || []),
    };

    const parentId = `${nnn}-${shot.id}`;

    await ctx.spawn({
      id: parentId,
      title: `Shot: ${shot.id} — ${shot.action}`,
      dependencies: [],
      tags: ['shot', 'video'],
      vars,
      body: `Render video for ${shot.id}.`,
    });

    const basePath = `.converge/playbooks/default/tasks/08-shots/tasks/${parentId}`;
    const steps = ['01-prompt', '02-generate', '03-qc', '04-regen-guard'];
    const templateBase = `${WBS_ROOT}/shot`;

    for (const step of steps) {
      const id = `${nnn}-${step}`;
      const templatePath = `${templateBase}/tasks/${step}/TASK.md`;
      const writeToPath = `${basePath}/tasks/${id}/TASK.md`;

      await ctx.spawn(
        { _type: 'template-ref', path: templatePath, vars },
        { id, writeToPath },
      );
    }
  }

  console.log(`  ✅ Spawned ${shots.length} shot pipelines`);
}
