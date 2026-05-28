import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProjectDir } from '../../../../../src/lib/project-dir';
import { mapRunState } from '../../../../../src/lib/mappers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

  const playbookDir = join(projectDir, '.converge', 'playbooks', name);
  if (!existsSync(join(playbookDir, 'playbook.yml'))) {
    return new Response(JSON.stringify({ error: `Playbook "${name}" not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      function send(event: string, data: any) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      }

      send('run-status', { status: 'starting', playbook: name, projectDir });

      const child = spawn('converge', ['run', name, '--skip-preflight'], {
        cwd: projectDir,
        env: { ...process.env, CONVERGE_PROJECT_DIR: projectDir },
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stdout += text;
        for (const line of text.split(/\r?\n/).filter((l: string) => l.trim())) {
          send('log', { stream: 'stdout', text: line });

          // Try to parse structured events from stdout
          try {
            const parsed = JSON.parse(line);
            if (parsed.kind) {
              send('run-event', parsed);
            }
          } catch {
            // Not JSON — regular log line
          }
        }

        // Check if runstate.json updated and send it
        try {
          const runstatePath = join(projectDir, '.converge', 'journal', name, 'runstate.json');
          if (existsSync(runstatePath)) {
            const rs = JSON.parse(readFileSync(runstatePath, 'utf-8'));
            send('runstate', mapRunState(rs));
          }
        } catch { /* skip */ }
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderr += text;
        for (const line of text.split(/\r?\n/).filter((l: string) => l.trim())) {
          send('log', { stream: 'stderr', text: line });
        }
      });

      child.on('close', (code) => {
        // Final runstate read
        try {
          const runstatePath = join(projectDir, '.converge', 'journal', name, 'runstate.json');
          if (existsSync(runstatePath)) {
            const rs = JSON.parse(readFileSync(runstatePath, 'utf-8'));
            send('runstate', mapRunState(rs));
          }
        } catch { /* skip */ }

        send('run-status', {
          status: code === 0 ? 'complete' : 'failed',
          exitCode: code,
          playbook: name,
        });

        if (!closed) {
          try { controller.close(); } catch {}
        }
      });

      child.on('error', (err) => {
        send('run-status', { status: 'error', error: err.message });
        if (!closed) {
          try { controller.close(); } catch {}
        }
      });

      // Periodic runstate polling (every 2s) to catch updates between stdout lines
      const poller = setInterval(() => {
        if (closed) { clearInterval(poller); return; }
        try {
          const runstatePath = join(projectDir, '.converge', 'journal', name, 'runstate.json');
          if (existsSync(runstatePath)) {
            const rs = JSON.parse(readFileSync(runstatePath, 'utf-8'));
            send('runstate', mapRunState(rs));
          }
        } catch { /* skip */ }
      }, 2000);

      // Store cleanup
      (controller as any).__cleanup = () => {
        closed = true;
        clearInterval(poller);
        try { child.kill(); } catch {}
      };
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
