/**
 * WBS: Score per scene.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const WBS_ROOT = '.converge/playbooks/default/tasks/09-audio/003-score/wbs/templates';

export async function run(ctx) {
  const { projectDir } = ctx;
  const scenes = JSON.parse(readFileSync(join(projectDir, 'scenes.json'), 'utf-8'));
  const shots = JSON.parse(readFileSync(join(projectDir, 'shots.json'), 'utf-8'));

  console.log(`  🎼 Spawning score tasks for ${scenes.length} scene(s)`);

  for (const scene of scenes) {
    const sceneShots = shots.filter((s) => s.scene_id === scene.id);
    const totalDuration = sceneShots.reduce((acc, s) => acc + (s.duration_s || 0), 0);

    const vars = {
      sceneId: scene.id,
      sceneBeat: scene.beat,
      sceneTone: scene.emotional_tone || '',
      sceneTimeOfDay: scene.time_of_day,
      totalDuration: totalDuration.toFixed(1),
      shotIdsJson: JSON.stringify(sceneShots.map((s) => s.id)),
    };

    const templatePath = `${WBS_ROOT}/scene/tasks/01-score/TASK.md`;
    const writeToPath = `.converge/playbooks/default/tasks/09-audio/003-score/tasks/${scene.id}/TASK.md`;

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars },
      { id: scene.id, writeToPath },
    );
  }
}
