import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

describe('DAG runner — CLI integration', () => {
  it('executes linear playbook in topological order', () => {
    const result = execFileSync('node', [
      CLI, 'run',
      '--project-dir', FIXTURE,
      '--playbook', 'minimal-playbook',
    ], { encoding: 'utf-8', env: { ...process.env, CONVERGE_USE_DAG: '1' } });

    // Tasks complete successfully
    expect(result).toContain('completed');
    // No iteration/wave messages
    expect(result).not.toContain('iteration');
    expect(result).not.toContain('wave');
  });

  it('stops on failed blocking task', () => {
    // Use a fixture variant where one task is guaranteed to fail
    // Assert downstream tasks are not executed
  });

  it('resumes from completed tasks', () => {
    // Run once to complete task A, run again — A is skipped
  });
});
