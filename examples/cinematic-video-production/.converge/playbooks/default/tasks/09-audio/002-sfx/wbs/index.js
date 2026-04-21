/**
 * WBS: SFX per shot.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const WBS_ROOT = '.converge/playbooks/default/tasks/09-audio/002-sfx/wbs/templates';

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export async function run(ctx) {
  const { projectDir } = ctx;
  const shots = JSON.parse(readFileSync(join(projectDir, 'shots.json'), 'utf-8'));

  const sfxShots = shots.filter((s) => s.sfx_cues && s.sfx_cues.length > 0);
  console.log(`  🔊 ${sfxShots.length} of ${shots.length} shots have SFX cues`);

  for (const shot of sfxShots) {
    const globalIdx = shots.indexOf(shot);
    const nnn = String(globalIdx + 1).padStart(3, '0');
    const clipSlug = `${nnn}-${shot.id}-${slugify(shot.action)}`;

    const vars = {
      shotId: shot.id,
      clipDir: `clips/${clipSlug}`,
      sfxCuesJson: JSON.stringify(shot.sfx_cues),
      durationS: shot.duration_s,
    };

    const templatePath = `${WBS_ROOT}/cue/tasks/01-sfx/TASK.md`;
    const writeToPath = `.converge/playbooks/default/tasks/09-audio/002-sfx/tasks/${shot.id}/TASK.md`;

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars },
      { id: shot.id, writeToPath },
    );
  }
}
