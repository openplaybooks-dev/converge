import type { ConvergePlugin } from '../../types.ts';

const dockerPlugin: ConvergePlugin = {
  name: 'docker',
  version: '1.0.0',
  description: 'Docker build verification and deploy task type',
  setup(api) {
    const opts = api.options as {
      dockerfile?: string;
      registry?: string;
      imageName?: string;
    };

    const dockerfile = opts?.dockerfile ?? 'Dockerfile';
    const imageName = opts?.imageName ?? 'app';

    api.addCheck('docker-build', async (ctx: any) => {
      const r = await ctx.tools.shell.run(
        `docker build -f ${dockerfile} -t ${imageName}:check .`
      );
      return { passed: r.exitCode === 0, output: r.stderr };
    });

    api.addCheck('docker-run', async (ctx: any) => {
      const r = await ctx.tools.shell.run(
        `docker run --rm ${imageName}:check echo "Container starts OK"`
      );
      return { passed: r.exitCode === 0, output: r.stdout };
    });

    api.addTaskType({
      name: 'deploy',
      description: 'Deployment tasks with Docker verification',
      defaults: { skill: 'deploy-agent' },
      checks: ['docker-build'],
    });
  },
};

export default dockerPlugin;
