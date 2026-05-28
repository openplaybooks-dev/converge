import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProjectDir } from '../../../../../src/lib/project-dir';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const projectDir = resolveProjectDir(request);
  if (!projectDir) {
    return new Response(JSON.stringify({ error: 'CONVERGE_PROJECT_DIR not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const playbookYml = join(projectDir, '.converge', 'playbooks', name, 'playbook.yml');
  if (!existsSync(playbookYml)) {
    return new Response(JSON.stringify({ error: `Playbook "${name}" not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolveP) => {
    const child = spawn('converge', ['clean', `--playbook=${name}`, '--all', '--yes'], {
      cwd: projectDir,
      env: { ...process.env, CONVERGE_PROJECT_DIR: projectDir },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (c: Buffer) => { stdout += c.toString(); });
    child.stderr?.on('data', (c: Buffer) => { stderr += c.toString(); });
    child.on('close', (code) => resolveP({ code: code ?? -1, stdout, stderr }));
    child.on('error', (err) => resolveP({ code: -1, stdout, stderr: stderr + String(err) }));
  });

  return new Response(JSON.stringify({
    ok: result.code === 0,
    exitCode: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
  }), {
    status: result.code === 0 ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
