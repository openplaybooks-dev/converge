/**
 * Playbook-Journal Sync
 * 
 * Manages synchronization between playbook templates and journal execution state.
 * Detects when playbook has changed and prompts user for action.
 */

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PlaybookHashInfo } from './hash.ts';
import { calculatePlaybookHash } from './hash.ts';

export type PlaybookSyncStatus = 'new' | 'up-to-date' | 'outdated';

export interface PlaybookChanges {
  modified: string[];
  added: string[];
  deleted: string[];
}

export interface PlaybookStatusResult {
  status: PlaybookSyncStatus;
  currentHash: string;
  journalHash: string | null;
  currentHashInfo: PlaybookHashInfo;
  journalHashInfo?: PlaybookHashInfo;
  changes?: PlaybookChanges;
}

/**
 * Check if playbook has changed since journal was created.
 */
export async function checkPlaybookStatus(
  playbookDir: string,
  journalDir: string
): Promise<PlaybookStatusResult> {
  // Calculate current playbook hash
  const currentHashInfo = await calculatePlaybookHash(playbookDir);

  // Read journal's recorded hash
  const journalHashFile = join(journalDir, '.playbook-hash');

  if (!existsSync(journalHashFile)) {
    return {
      status: 'new',
      currentHash: currentHashInfo.hash,
      journalHash: null,
      currentHashInfo,
    };
  }

  const journalHashInfo: PlaybookHashInfo = JSON.parse(
    await readFile(journalHashFile, 'utf-8')
  );

  if (currentHashInfo.hash === journalHashInfo.hash) {
    return {
      status: 'up-to-date',
      currentHash: currentHashInfo.hash,
      journalHash: journalHashInfo.hash,
      currentHashInfo,
      journalHashInfo,
    };
  }

  // Playbook changed - detect what changed
  const changes = detectFileChanges(
    journalHashInfo.files,
    currentHashInfo.files
  );

  return {
    status: 'outdated',
    currentHash: currentHashInfo.hash,
    journalHash: journalHashInfo.hash,
    changes,
    currentHashInfo,
    journalHashInfo,
  };
}

/**
 * Detect which files were added, modified, or deleted.
 */
function detectFileChanges(
  oldFiles: string[],
  newFiles: string[]
): PlaybookChanges {
  const oldSet = new Set(oldFiles);
  const newSet = new Set(newFiles);

  const added: string[] = [];
  const deleted: string[] = [];
  const modified: string[] = [];

  // Find added files
  for (const file of newFiles) {
    if (!oldSet.has(file)) {
      added.push(file);
    }
  }

  // Find deleted files
  for (const file of oldFiles) {
    if (!newSet.has(file)) {
      deleted.push(file);
    }
  }

  // Files in both sets might be modified (we can't tell without content hash)
  // For now, we just track add/delete
  // TODO: Add per-file content hashing for better change detection

  return { added, deleted, modified };
}

/**
 * Sync journal hash to current playbook hash.
 * This marks the journal as up-to-date with the current playbook.
 */
export async function syncJournalHash(
  playbookDir: string,
  journalDir: string
): Promise<PlaybookHashInfo> {
  const hashInfo = await calculatePlaybookHash(playbookDir);

  await mkdir(journalDir, { recursive: true });
  await writeFile(
    join(journalDir, '.playbook-hash'),
    JSON.stringify(hashInfo, null, 2)
  );

  return hashInfo;
}

/**
 * Clear journal directory (for restart).
 * Preserves .playbook-hash file.
 */
export async function clearJournal(journalDir: string): Promise<void> {
  const tasksDir = join(journalDir, 'tasks');
  const sessionsDir = join(journalDir, 'sessions');

  if (existsSync(tasksDir)) {
    await rm(tasksDir, { recursive: true, force: true });
  }

  if (existsSync(sessionsDir)) {
    await rm(sessionsDir, { recursive: true, force: true });
  }
}
