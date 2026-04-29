/**
 * Per-scene WBS: spawns 6 sub-stages.
 *
 * concept → extract (NEW) → background → tiles → props → manifest
 *
 * Ordering is enforced by `inputs:` gates on each downstream stage's
 * TASK.md — every stage past `01-concept` declares
 * `inputs: ["assets/scenes/{{scene_id}}/concept.png"]` (and `05-manifest`
 * additionally requires the tilesheet atlas). The runner blocks each
 * stage until its inputs exist on disk, which gives a natural happens-
 * before chain without needing framework `depends_on` support (which
 * `WbsSpawnOptions` doesn't accept anyway).
 *
 * The numeric prefixes on the spawn IDs (`scene-{id}-01-concept`, etc.)
 * align journal directory names with execution order — the runner's
 * tree traversal picks tasks alphabetically, so without ordinal
 * prefixes `background` would sort before `concept` and burn attempts
 * on a missing-input dance before auto-repair eventually scheduled
 * the producer.
 */

const STAGES_ROOT = '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates';

export async function run(ctx) {
  const { vars } = ctx;
  const sceneId = vars.scene_id;
  if (!sceneId) {
    console.log('  ⚠️  scene_id missing from vars — skipping');
    return;
  }

  const baseVars = {
    scene_id: sceneId,
    scene_name: vars.scene_name || sceneId,
    scene_biome: vars.scene_biome || '',
    scene_description: vars.scene_description || '',
    bg_layers: vars.bg_layers || '[]',
    tile_variant_ids: vars.tile_variant_ids || '[]',
    scene_prop_ids: vars.scene_prop_ids || '[]',
  };

  // 02-background is a CONTAINER stage: a parent TASK.md whose journal
  // directory holds three numbered child sub-tasks (02a-bg-far,
  // 02b-bg-mid, 02c-bg-near). The framework's `discoverEpicChildren`
  // picks up numbered subdirectories that contain TASK.md files, so we
  // populate them after the parent is spawned. No inner WBS — each
  // child is a static, hand-authored TASK.md with its own prompt and
  // fitness checks.
  //
  // Order across siblings is enforced by `inputs:` gates on each child:
  // bg-mid declares bg-far.png as input, bg-near declares bg-mid.png.
  const stages = [
    { dir: '01-concept',     suffix: '01-concept' },
    { dir: '01b-extract',    suffix: '01b-extract' },
    { dir: '02a-decompose',  suffix: '02a-decompose' },
    { dir: '02b-stage',      suffix: '02b-stage' },
    { dir: '02c-background', suffix: '02c-background' },
    { dir: '03-tiles',       suffix: '03-tiles' },
    { dir: '04-props',       suffix: '04-props' },
    { dir: '05-manifest',    suffix: '05-manifest' },
    { dir: '07-preview',     suffix: '07-preview' },
  ];

  // Helper: lazy-load fs/path; install a child template (TASK.md only)
  // into the parent's journal directory with the same var substitution
  // template-ref does, so discoverEpicChildren picks it up.
  const { readFile, writeFile, mkdir } = await import('node:fs/promises');
  const { join, dirname, resolve } = await import('node:path');
  const substitute = (raw, vars) =>
    raw.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
      if (!(key in vars)) return _m;
      const value = vars[key];
      return value == null ? '' : String(value);
    });

  // Where this scene's spawned tasks land in the journal. `ctx` does not
  // expose the absolute spawn directory cleanly; reconstruct from the
  // known journal layout used by 05-scenes.
  const sceneJournalDir = resolve(
    ctx.projectDir,
    '.converge/journal/default/tasks/05-scenes/tasks',
    `scene-${sceneId}`,
    'tasks',
  );

  for (const stage of stages) {
    const stageId = `scene-${sceneId}-${stage.suffix}`;
    await ctx.spawn(
      { _type: 'template-ref', path: `${STAGES_ROOT}/${stage.dir}/TASK.md`, vars: baseVars },
      { id: stageId }
    );
    console.log(`    ✓ ${stageId}`);

    // For container stages, also install each numbered child TASK.md
    // under the parent's journal dir so the framework discovers them.
    if (stage.children && stage.children.length > 0) {
      const parentDir = join(sceneJournalDir, stageId);
      for (const childName of stage.children) {
        const srcPath = `${STAGES_ROOT}/${stage.dir}/${childName}/TASK.md`;
        const destPath = join(parentDir, childName, 'TASK.md');
        const raw = await readFile(resolve(ctx.projectDir, srcPath), 'utf-8');
        const rendered = substitute(raw, baseVars);
        await mkdir(dirname(destPath), { recursive: true });
        await writeFile(destPath, rendered, 'utf-8');
        console.log(`      ↳ child ${childName}`);
      }
    }
  }
}
