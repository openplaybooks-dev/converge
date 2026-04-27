/**
 * WBS: per-state video pipeline.
 *
 * Spawns three sequential subtasks for one animation state:
 *   1. video    — call the video-generate skill (img2vid on the canonical ref)
 *   2. extract  — split the mp4 into 8 frames (chroma-keyed)
 *   3. compose  — composite into the 4×2 spritesheet + atlas.json
 *
 * Each subtask depends on the previous one so partial re-runs work
 * (re-extract without re-generating video, re-compose without re-extracting).
 */

export async function run(ctx) {
  const { vars } = ctx;
  const { char_id, state_name } = vars;

  const baseId = `${char_id}-spritesheet-${state_name}`;
  const templates = [
    { step: '01-video', suffix: 'video' },
    { step: '02-extract', suffix: 'extract' },
    { step: '03-compose', suffix: 'compose' },
  ];

  const root = '.converge/playbooks/default/tasks/03-characters/03-generation/wbs/templates/character/04-spritesheets/wbs/templates/state/wbs/templates';

  let prevId = null;
  for (const { step, suffix } of templates) {
    const id = `${baseId}-${suffix}`;
    const templatePath = `${root}/${step}/TASK.md`;
    const stepVars = { ...vars };
    const opts = { id };
    if (prevId) opts.depends_on = [prevId];
    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: stepVars },
      opts,
    );
    console.log(`    ✓ ${id}`);
    prevId = id;
  }

  console.log(`  ✅ Spawned ${templates.length} subtask(s) for ${state_name}`);
}
