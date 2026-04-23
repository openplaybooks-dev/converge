/**
 * WBS: Animation States
 * 
 * Generate sprite sheets for each animation state
 */

export async function run(ctx) {
  const { vars } = ctx;
  const { char_id, char_name, animation_states } = vars;

  const states = JSON.parse(animation_states);
  
  console.log(`  Generating ${states.length} animation state(s) for ${char_name}\n`);

  for (const state of states) {
    const taskId = `${char_id}-state-${state}`;
    const templatePath = `.converge/playbooks/default/tasks/03-characters/03-generation/wbs/templates/character/04-states/wbs/templates/state/TASK.md`;
    const basePath = `.converge/playbooks/default/tasks/03-characters/03-generation/tasks/${char_id}-04-states/tasks`;
    const writeToPath = `${basePath}/${taskId}/TASK.md`;

    const stateVars = {
      ...vars,
      state_name: state,
      state_description: `${state.charAt(0).toUpperCase() + state.slice(1)} animation for ${char_name}`,
    };

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: stateVars },
      { id: taskId, writeToPath }
    );

    console.log(`    ✓ ${state}`);
  }

  console.log(`\n  ✅ Spawned ${states.length} animation state task(s)`);
}
