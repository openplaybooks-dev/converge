/**
 * Playbook Paths
 *
 * Resolves all base directories for a playbook. Created once at command start,
 * passed through to every API that needs paths. No env vars, no hardcoding.
 *
 * Usage:
 *   const paths = resolvePlaybookPaths(projectDir, 'fix-issue');
 *   // paths.tasks    → .harness/playbooks/fix-issue/tasks/
 *   // paths.journal  → .harness/journal/fix-issue/
 *   // paths.sessions → .harness/journal/fix-issue/sessions/
 *
 *   const defaults = resolvePlaybookPaths(projectDir);
 *   // paths.tasks    → .harness/epics/                (legacy default)
 *   // paths.journal  → .harness/journal/
 *   // paths.sessions → .harness/journal/sessions/
 */

import { join } from 'node:path';

/**
 * All resolved paths for a playbook.
 * Every API that needs a filesystem path should receive this instead of raw projectDir.
 */
export interface PlaybookPaths {
  /** Absolute project root */
  projectDir: string;

  /** Playbook name ('default' for legacy/unnamed) */
  playbook: string;

  /** Where task definitions live (TASK.md files, discovered by scanner) */
  tasks: string;

  /** Where goal definitions live */
  goals: string;

  /** Journal root for this playbook */
  journal: string;

  /** Where task execution journals go (checkpoints, attempts, etc.) */
  journalTasks: string;

  /** Where session logs go */
  sessions: string;

  /** Playbook definition file (playbook.yml) */
  config: string;
}

/**
 * Resolve all paths for a playbook.
 *
 * @param projectDir - Absolute project root
 * @param playbook   - Playbook name, or undefined for legacy default
 */
export function resolvePlaybookPaths(projectDir: string, playbook?: string): PlaybookPaths {
  if (playbook && playbook !== 'default') {
    // Named playbook — everything scoped under playbooks/{name}/
    const pbRoot = join(projectDir, '.harness', 'playbooks', playbook);
    const jRoot = join(projectDir, '.harness', 'journal', playbook);

    return {
      projectDir,
      playbook,
      tasks: join(pbRoot, 'tasks'),
      goals: join(pbRoot, 'goals'),
      journal: jRoot,
      journalTasks: join(jRoot, 'tasks'),
      sessions: join(jRoot, 'sessions'),
      config: join(pbRoot, 'playbook.yml'),
    };
  }

  // Default playbook — same structure as named, under 'default'
  const defRoot = join(projectDir, '.harness', 'playbooks', 'default');
  const defJournal = join(projectDir, '.harness', 'journal', 'default');

  return {
    projectDir,
    playbook: 'default',
    tasks: join(defRoot, 'tasks'),
    goals: join(defRoot, 'goals'),
    journal: defJournal,
    journalTasks: join(defJournal, 'tasks'),
    sessions: join(defJournal, 'sessions'),
    config: join(defRoot, 'playbook.yml'),
  };
}
