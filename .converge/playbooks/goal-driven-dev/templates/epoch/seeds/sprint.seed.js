/**
 * Sprint inner seed — spawns plan → implement → verify children.
 */
const P = ".converge/playbooks/goal-driven-dev/templates/epoch/tasks";

export async function run(ctx) {
  const v = ctx.vars;
  const prefix = v.taskId;

  await ctx.spawn(
    { _type: "template-ref", path: `${P}/plan/TASK.md`, vars: v },
    { id: `${prefix}-plan` },
  );
  await ctx.spawn(
    { _type: "template-ref", path: `${P}/implement/TASK.md`, vars: { ...v, planTaskId: `${prefix}-plan` } },
    { id: `${prefix}-implement` },
  );
  await ctx.spawn(
    { _type: "template-ref", path: `${P}/verify/TASK.md`, vars: { ...v, planTaskId: `${prefix}-plan`, implTaskId: `${prefix}-implement` } },
    { id: `${prefix}-verify` },
  );

  ctx.log.info(`Sprint pipeline: ${prefix}-plan → ${prefix}-implement → ${prefix}-verify`);
  return ctx.loop.stop();
}
