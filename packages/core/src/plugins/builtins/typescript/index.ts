import type { ConvergePlugin } from '../../types.ts';

const typescriptPlugin: ConvergePlugin = {
  name: 'typescript',
  version: '1.0.0',
  description: 'TypeScript type checking and coding task type',
  setup(api) {
    api.addCheck('tsc', async (ctx: any) => {
      const r = await ctx.tools.shell.run('npx tsc --noEmit');
      return { passed: r.exitCode === 0, output: r.stderr };
    });

    api.addTaskType({
      name: 'coding',
      description: 'Implementation tasks with TypeScript checks',
      defaults: { skill: 'coding-agent' },
      checks: ['tsc'],
    });

    api.addVars({ language: 'typescript' });
  },
};

export default typescriptPlugin;
