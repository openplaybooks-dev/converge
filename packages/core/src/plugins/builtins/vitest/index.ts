import type { ConvergePlugin } from '../../types.ts';

const vitestPlugin: ConvergePlugin = {
  name: 'vitest',
  version: '1.0.0',
  description: 'Vitest test runner',
  setup(api) {
    api.addCheck('test', async (ctx: any) => {
      const r = await ctx.tools.shell.run('npx vitest run');
      return { passed: r.exitCode === 0, output: r.stdout };
    });

    if (api.hasPlugin('typescript')) {
      api.extendTaskType('coding', { checks: ['test'] });
    }
  },
};

export default vitestPlugin;
