/**
 * WBS: Keyframes via Compositing Bridge
 *
 * For each shot, spawn TWO pipelines (start + end frame), each with three steps:
 *   01-author-composition  → compositions/{shot_id}/{frame}.json
 *   02-preview             → compositions/{shot_id}/{frame}.preview.png
 *   03-blend               → keyframes/{shot_id}/{frame}.png
 *
 * Shots with static camera and no element motion skip the end pipeline —
 * the video phase will hold-on-start for those.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const WBS_ROOT = '.converge/playbooks/default/tasks/07-keyframes/wbs/templates';

export async function run(ctx) {
  const { projectDir } = ctx;
  const shots = JSON.parse(readFileSync(join(projectDir, 'shots.json'), 'utf-8'));

  let totalFramesSpawned = 0;

  for (const shot of shots) {
    const frames = shouldRenderEndFrame(shot) ? ['start', 'end'] : ['start'];

    for (const frame of frames) {
      const pipelineId = `${shot.id}-${frame}`;

      const vars = {
        shotId: shot.id,
        sceneId: shot.scene_id,
        shotType: shot.shot_type,
        cameraMove: shot.camera_move || 'static',
        lensMm: shot.lens_mm || 40,
        durationS: shot.duration_s,
        action: shot.action,
        mood: shot.mood || '',
        charactersInFrame: JSON.stringify(shot.character_ids_in_frame || []),
        wardrobeRefs: JSON.stringify(shot.wardrobe_refs || {}),
        locationId: shot.location_ref.location_id,
        locationVariant: shot.location_ref.variant,
        frame,                 // "start" | "end"
        pipelineId,
        compositionPath: `compositions/${shot.id}/${frame}.json`,
        previewPath: `compositions/${shot.id}/${frame}.preview.png`,
        keyframePath: `keyframes/${shot.id}/${frame}.png`,
      };

      await ctx.spawn({
        id: pipelineId,
        title: `${shot.id} ${frame} frame`,
        dependencies: [],
        tags: ['keyframe', 'composition', frame],
        vars,
        body: `Render ${frame} keyframe for ${shot.id} via composition → preview → blend.`,
      });

      const steps = ['01-author-composition', '02-preview', '03-blend'];
      const templateBase = `${WBS_ROOT}/frame`;

      for (const step of steps) {
        const id = `${pipelineId}-${step}`;
        const templatePath = `${templateBase}/tasks/${step}/TASK.md`;

        await ctx.spawn(
          { _type: 'template-ref', path: templatePath, vars },
          { id },
        );
      }

      totalFramesSpawned++;
    }
  }

  console.log(`  🎞️  Spawned ${totalFramesSpawned} keyframe pipeline(s) across ${shots.length} shot(s)`);
}

/**
 * Heuristic: generate an end frame only when motion is actually expected.
 * Static camera + no action keywords suggesting motion → skip end (hold on start).
 */
function shouldRenderEndFrame(shot) {
  if ((shot.camera_move || 'static') !== 'static') return true;
  const action = (shot.action || '').toLowerCase();
  const motionWords = [
    'walk', 'run', 'turn', 'rise', 'stand', 'sit', 'fall', 'reach',
    'open', 'close', 'enter', 'exit', 'lift', 'drop', 'push', 'pull',
    'look', 'glance', 'nod', 'shake', 'step', 'move', 'cross', 'pick up',
  ];
  return motionWords.some((w) => action.includes(w));
}
