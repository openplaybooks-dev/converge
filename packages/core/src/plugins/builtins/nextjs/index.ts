import type { ConvergePlugin } from '../../types.ts';

const nextjsPlugin: ConvergePlugin = {
  name: 'nextjs',
  version: '1.0.0',
  description: 'Next.js build and lint checks',
  requires: ['typescript'],
  setup(api) {
    const opts = api.options as { appDir?: boolean; turbopack?: boolean };

    api.addCheck('build', async (ctx: any) => {
      const r = await ctx.tools.shell.run('npx next build');
      return { passed: r.exitCode === 0, output: r.stderr };
    });

    api.addCheck('lint', async (ctx: any) => {
      const r = await ctx.tools.shell.run('npx next lint');
      return { passed: r.exitCode === 0, output: r.stdout };
    });

    api.extendTaskType('coding', { checks: ['lint'] });

    api.addVars({
      framework: 'nextjs',
      appDir: opts?.appDir ?? true,
      turbopack: opts?.turbopack ?? false,
    });
  },
};

export default nextjsPlugin;
