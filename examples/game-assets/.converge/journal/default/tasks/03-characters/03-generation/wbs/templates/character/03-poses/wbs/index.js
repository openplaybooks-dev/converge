/**
 * WBS: Character Poses
 * 
 * Generate pose variations for a character (attack, defend, jump, etc.)
 */

export async function run(ctx) {
  const { vars } = ctx;
  const { char_id, char_name } = vars;

  const poses = ['attack', 'defend', 'jump', 'crouch'];
  
  console.log(`  Generating ${poses.length} pose(s) for ${char_name}\n`);

  for (const pose of poses) {
    const taskId = `${char_id}-pose-${pose}`;
    const templatePath = `.converge/playbooks/default/tasks/03-characters/03-generation/wbs/templates/character/03-poses/wbs/templates/pose/TASK.md`;

    const poseVars = {
      ...vars,
      pose_name: pose,
      pose_description: `${pose.charAt(0).toUpperCase() + pose.slice(1)} pose for ${char_name}`,
    };

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: poseVars },
      { id: taskId }
    );

    console.log(`    ✓ ${pose}`);
  }

  console.log(`\n  ✅ Spawned ${poses.length} pose task(s)`);
}
