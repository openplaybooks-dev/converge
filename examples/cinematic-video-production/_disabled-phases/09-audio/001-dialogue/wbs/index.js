/**
 * WBS: Dialogue TTS per shot.
 * Skips shots with no dialogue.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const WBS_ROOT = '.converge/playbooks/default/tasks/09-audio/001-dialogue/wbs/templates';

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export async function run(ctx) {
  const { projectDir } = ctx;
  const shots = JSON.parse(readFileSync(join(projectDir, 'shots.json'), 'utf-8'));

  const dialogueShots = shots.filter((s) => s.dialogue && s.dialogue.length > 0);
  console.log(`  🎙️  ${dialogueShots.length} of ${shots.length} shots have dialogue`);

  for (let i = 0; i < dialogueShots.length; i++) {
    const shot = dialogueShots[i];
    const globalIdx = shots.indexOf(shot);
    const nnn = String(globalIdx + 1).padStart(3, '0');
    const clipSlug = `${nnn}-${shot.id}-${slugify(shot.action)}`;

    const vars = {
      shotId: shot.id,
      clipDir: `clips/${clipSlug}`,
      dialogueJson: JSON.stringify(shot.dialogue),
    };

    const templatePath = `${WBS_ROOT}/line/tasks/01-tts/TASK.md`;
    const writeToPath = `.converge/playbooks/default/tasks/09-audio/001-dialogue/tasks/${shot.id}/TASK.md`;

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars },
      { id: shot.id, writeToPath },
    );
  }
}
