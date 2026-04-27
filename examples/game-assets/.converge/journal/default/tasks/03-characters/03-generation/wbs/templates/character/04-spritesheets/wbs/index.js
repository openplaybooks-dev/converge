/**
 * WBS: Sprite Sheets
 *
 * Fan out one shell-WBS subtask per animation state.
 * Each leaf invokes scripts/generate_spritesheet.py.
 */

export async function run(ctx) {
  const { vars } = ctx;
  const { char_id, char_name, animation_states } = vars;

  const states = JSON.parse(animation_states);

  console.log(`  Spawning ${states.length} sprite-sheet task(s) for ${char_name}\n`);

  for (const state of states) {
    const taskId = `${char_id}-spritesheet-${state}`;
    const templatePath = `.converge/playbooks/default/tasks/03-characters/03-generation/wbs/templates/character/04-spritesheets/wbs/templates/state/TASK.md`;

    const stateVars = {
      ...vars,
      state_name: state,
      state_description: `${state.charAt(0).toUpperCase() + state.slice(1)} animation sprite sheet for ${char_name}`,
    };

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: stateVars },
      { id: taskId }
    );

    console.log(`    ✓ ${state}`);
  }

  console.log(`\n  ✅ Spawned ${states.length} sprite-sheet task(s)`);
}
