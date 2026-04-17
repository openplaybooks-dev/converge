import type { ConvergePlugin } from '../../types.ts';

const eslintPlugin: ConvergePlugin = {
  name: 'eslint',
  version: '1.0.0',
  description: 'ESLint code quality checks',
  setup(api) {
    const opts = api.options as { fix?: boolean; extensions?: string[] };
    const fix = opts?.fix ?? false;
    const extensions = opts?.extensions ?? ['.ts', '.tsx', '.js', '.jsx'];

    api.addCheck('eslint', async (ctx: any) => {
      const ext = extensions.map(e => `--ext ${e}`).join(' ');
      const fixFlag = fix ? ' --fix' : '';
      const r = await ctx.tools.shell.run(`npx eslint ${ext}${fixFlag} src/`);
      return { passed: r.exitCode === 0, output: r.stdout };
    });
  },
};

export default eslintPlugin;
