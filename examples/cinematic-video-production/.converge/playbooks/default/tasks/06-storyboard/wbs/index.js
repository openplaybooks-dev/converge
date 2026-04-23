/**
 * WBS: Storyboard Thumbnails
 *
 * Spawns one thumbnail task per shot in shots.json. All parallel.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const WBS_ROOT = '.converge/playbooks/default/tasks/06-storyboard/wbs/templates';

export async function run(ctx) {
  const { projectDir } = ctx;
  const shots = JSON.parse(readFileSync(join(projectDir, 'shots.json'), 'utf-8'));

  console.log(`  🎨 Spawning ${shots.length} storyboard thumbnail task(s)`);

  for (const shot of shots) {
    const vars = {
      shotId: shot.id,
      sceneId: shot.scene_id,
      shotType: shot.shot_type,
      cameraMove: shot.camera_move || 'static',
      action: shot.action,
      charactersInFrame: JSON.stringify(shot.character_ids_in_frame || []),
      locationId: shot.location_ref.location_id,
      locationVariant: shot.location_ref.variant,
      mood: shot.mood || '',
    };

    const templatePath = `${WBS_ROOT}/shot/tasks/01-thumb/TASK.md`;
    const writeToPath = `.converge/playbooks/default/tasks/06-storyboard/tasks/${shot.id}/TASK.md`;

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars },
      { id: shot.id, writeToPath },
    );
  }

  console.log(`  ✅ Spawned ${shots.length} thumbnails`);
}
