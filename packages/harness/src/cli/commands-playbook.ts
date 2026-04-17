/**
 * CLI Commands for Playbook Management
 *
 * Subcommands:
 *   harness playbook list                  — List available playbooks
 *   harness playbook info <name>           — Show playbook details
 *   harness playbook history <name>        — Show execution history
 *
 * Running playbooks is done via `harness run --playbook=<name>`.
 */

import { resolve } from 'node:path';
import {
  discoverPlaybooks,
  loadPlaybook,
  validatePlaybook,
} from '../playbook/loader.ts';
import {
  listExecutions,
  readTrends,
} from '../playbook/journal.ts';

/* ────────────────────────────────────────────────────────────────── */
/*  Command Options                                                    */
/* ────────────────────────────────────────────────────────────────── */

export interface PlaybookListOptions {
  dir?: string;
  verbose?: boolean;
}

export interface PlaybookInfoOptions {
  dir?: string;
}

export interface PlaybookHistoryOptions {
  dir?: string;
  last?: number;
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: playbook list                                             */
/* ────────────────────────────────────────────────────────────────── */

export async function playbookListCommand(options: PlaybookListOptions = {}): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const playbooks = await discoverPlaybooks(projectDir);

  console.log('\n   Available Playbooks:\n');

  if (playbooks.length === 0) {
    console.log('   No playbooks found.');
    console.log('   Add playbook directories to .harness/playbooks/\n');
    return;
  }

  for (const pb of playbooks) {
    const source = pb.builtin ? '(built-in)' : '(project)';
    const mode = pb.def.run?.mode ? `[${pb.def.run.mode}]` : '';
    console.log(`   ${pb.def.name}  ${source} ${mode}`);
    if (pb.def.description) {
      console.log(`      ${pb.def.description}`);
    }
    if (options.verbose) {
      const localTasks = pb.def.tasks.filter(t => t.id);
      const playbookRefs = pb.def.tasks.filter(t => t.playbook);
      if (localTasks.length > 0) {
        console.log(`      Tasks: ${localTasks.map(t => t.id).join(' -> ')}`);
      }
      if (playbookRefs.length > 0) {
        console.log(`      Refs: ${playbookRefs.map(t => t.playbook).join(', ')}`);
      }
      if (pb.def.inputs) {
        const inputKeys = Object.keys(pb.def.inputs);
        if (inputKeys.length > 0) {
          console.log(`      Inputs: ${inputKeys.join(', ')}`);
        }
      }
    }
    console.log();
  }

  console.log(`   Total: ${playbooks.length} playbook(s)\n`);
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: playbook info                                             */
/* ────────────────────────────────────────────────────────────────── */

export async function playbookInfoCommand(
  name: string,
  options: PlaybookInfoOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const pb = await loadPlaybook(name, projectDir);

  if (!pb) {
    console.error(`\n   Playbook "${name}" not found.`);
    console.error('   Run "harness playbook list" to see available playbooks.\n');
    process.exit(1);
  }

  const source = pb.builtin ? 'built-in' : 'project';

  console.log(`\n   Playbook: ${pb.def.name}`);
  console.log(`   Source: ${source} (${pb.templateDir})`);
  if (pb.def.description) {
    console.log(`   ${pb.def.description}`);
  }

  // Inputs
  if (pb.def.inputs && Object.keys(pb.def.inputs).length > 0) {
    console.log('\n   Inputs:');
    for (const [key, input] of Object.entries(pb.def.inputs)) {
      const req = input.required ? ' (required)' : '';
      const def = input.default ? ` [default: ${input.default}]` : '';
      const desc = input.description ? ` -- ${input.description}` : '';
      console.log(`      --${key}${req}${def}${desc}`);
    }
  }

  // Tasks DAG
  console.log('\n   Tasks:');
  for (const task of pb.def.tasks) {
    const deps = task.depends_on?.length ? ` (after: ${task.depends_on.join(', ')})` : '';
    if (task.id) {
      console.log(`      ${task.id}${deps}`);
    } else if (task.playbook) {
      const withStr = task.with ? ` (${Object.entries(task.with).map(([k, v]) => `${k}=${v}`).join(', ')})` : '';
      console.log(`      [playbook: ${task.playbook}]${withStr}${deps}`);
    }
  }

  // Run config
  if (pb.def.run) {
    console.log('\n   Run Config:');
    const r = pb.def.run;
    if (r.mode) console.log(`      mode: ${r.mode}`);
    if (r.maxIterations) console.log(`      maxIterations: ${r.maxIterations}`);
    if (r.maxTaskAttempts) console.log(`      maxTaskAttempts: ${r.maxTaskAttempts}`);
    if (r.maxDuration !== undefined) {
      const dur = r.maxDuration === Infinity ? 'infinite' : `${r.maxDuration}ms`;
      console.log(`      maxDuration: ${dur}`);
    }
    if (r.resume !== undefined) console.log(`      resume: ${r.resume}`);
  }

  // Checks
  if (pb.def.checks && pb.def.checks.length > 0) {
    console.log('\n   Checks:');
    for (const check of pb.def.checks) {
      console.log(`      ${check.id}: ${check.cmd}`);
    }
  }

  // Validation
  const errors = validatePlaybook(pb.def, pb.templateDir);
  if (errors.length > 0) {
    console.log('\n   Errors:');
    for (const err of errors) {
      console.log(`      - ${err}`);
    }
  }

  console.log();
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: playbook history                                          */
/* ────────────────────────────────────────────────────────────────── */

export async function playbookHistoryCommand(
  name: string,
  options: PlaybookHistoryOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  let executions = await listExecutions(projectDir, name);

  if (executions.length === 0) {
    console.log(`\n   No executions found for playbook "${name}".\n`);
    return;
  }

  if (options.last) {
    executions = executions.slice(0, options.last);
  }

  console.log(`\n   Execution History: ${name}\n`);
  console.log(`   ${'Execution'.padEnd(30)}  ${'Status'.padEnd(10)}  ${'Duration'.padStart(8)}  ${'Done'.padStart(6)}  ${'Fail'.padStart(6)}`);
  console.log('   ' + '-'.repeat(72));

  for (const exec of executions) {
    const dur = exec.durationMs
      ? exec.durationMs >= 60000
        ? `${Math.round(exec.durationMs / 60000)}m`
        : `${Math.round(exec.durationMs / 1000)}s`
      : '...';
    const status = exec.status;
    const done = `${exec.tasksCompleted}/${exec.tasksTotal}`;
    const fail = exec.tasksFailed > 0 ? String(exec.tasksFailed) : '-';

    console.log(`   ${exec.executionId.padEnd(30)}  ${status.padEnd(10)}  ${dur.padStart(8)}  ${done.padStart(6)}  ${fail.padStart(6)}`);
  }

  console.log(`\n   Total: ${executions.length} execution(s)\n`);

  // Show trends if available
  const trends = await readTrends(projectDir, name);
  if (trends.length >= 2) {
    const first = trends[0];
    const last = trends[trends.length - 1];
    const completionDelta = last.tasksComplete - first.tasksComplete;
    const failDelta = last.tasksFailed - first.tasksFailed;
    console.log('   Trend:');
    console.log(`      Tasks completed: ${first.tasksComplete} → ${last.tasksComplete} (${completionDelta >= 0 ? '+' : ''}${completionDelta})`);
    console.log(`      Tasks failed: ${first.tasksFailed} → ${last.tasksFailed} (${failDelta >= 0 ? '+' : ''}${failDelta})`);
    console.log();
  }
}
