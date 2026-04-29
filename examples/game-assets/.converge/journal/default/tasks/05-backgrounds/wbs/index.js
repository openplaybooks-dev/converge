/**
 * WBS: Parallax Background Generation
 *
 * One leaf per backgrounds.json entry. No nesting — backgrounds are atomic.
 * Gated by vars.stop_after (skipped when "characters").
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PHASE = '05-backgrounds';
const WBS_ROOT = '.converge/playbooks/default/tasks/05-backgrounds/wbs/templates';

const ALLOWED_MODES = new Set(['sprites', 'export', 'full']);

export async function run(ctx) {
  const { projectDir, vars } = ctx;
  const mode = vars?.stop_after ?? 'sprites';

  if (!ALLOWED_MODES.has(mode)) {
    console.log(`  Skipped (${PHASE}, stop_after=${mode})`);
    return;
  }

  const bgPath = join(projectDir, 'assets', 'backgrounds.json');
  let backgrounds;
  try {
    backgrounds = JSON.parse(readFileSync(bgPath, 'utf-8'));
  } catch (err) {
    console.log(`  No backgrounds.json found (${err.code || err.message}) — skipping`);
    return;
  }

  if (!backgrounds?.length) {
    console.log('  backgrounds.json is empty — no backgrounds to generate');
    return;
  }

  console.log(`  Spawning ${backgrounds.length} parallax-layer task(s)\n`);

  for (const bg of backgrounds) {
    const taskId = `${bg.id}-background`;
    const [w, h] = bg.resolution || [1920, 1080];
    const bgVars = {
      bg_id: bg.id,
      bg_name: bg.name || bg.id,
      bg_description: bg.description || `Parallax background: ${bg.id}`,
      parallax_layer: bg.parallax_layer || 'mid',
      bg_width: String(w),
      bg_height: String(h),
    };
    await ctx.spawn(
      { _type: 'template-ref', path: `${WBS_ROOT}/background/TASK.md`, vars: bgVars },
      { id: taskId }
    );
    console.log(`    ✓ ${taskId} (${bg.parallax_layer}, ${w}x${h})`);
  }

  console.log(`\n  ✅ Spawned ${backgrounds.length} background task(s)`);
}
