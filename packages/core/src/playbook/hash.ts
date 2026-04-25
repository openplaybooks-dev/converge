/**
 * Playbook Hash Tracking
 * 
 * Calculates SHA256 hash of entire playbook tree for change detection.
 * Used to detect when playbook has been modified since journal was created.
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'glob';

export interface PlaybookHashInfo {
  hash: string;
  timestamp: string;
  files: string[];
}

/**
 * Calculate SHA256 hash of entire playbook directory tree.
 * Includes all files except .hash, node_modules, and .git.
 */
export async function calculatePlaybookHash(
  playbookDir: string
): Promise<PlaybookHashInfo> {
  const files = await glob('**/*', {
    cwd: playbookDir,
    ignore: ['.hash', 'node_modules/**', '.git/**'],
    nodir: true,
    dot: false,
  });

  // Sort for deterministic hashing
  files.sort();

  const hash = createHash('sha256');

  for (const file of files) {
    const content = await readFile(join(playbookDir, file), 'utf-8');
    hash.update(file); // Include path in hash
    hash.update(content); // Include content in hash
  }

  return {
    hash: hash.digest('hex'),
    timestamp: new Date().toISOString(),
    files,
  };
}

/**
 * Write playbook hash to .hash file in playbook directory.
 */
export async function writePlaybookHash(
  playbookDir: string,
  hashInfo: PlaybookHashInfo
): Promise<void> {
  const hashFile = join(playbookDir, '.hash');
  await writeFile(hashFile, JSON.stringify(hashInfo, null, 2));
}

/**
 * Read playbook hash from .hash file.
 * Returns null if file doesn't exist.
 */
export async function readPlaybookHash(
  playbookDir: string
): Promise<PlaybookHashInfo | null> {
  const hashFile = join(playbookDir, '.hash');
  
  if (!existsSync(hashFile)) {
    return null;
  }

  try {
    const content = await readFile(hashFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Calculate and write playbook hash in one operation.
 */
export async function updatePlaybookHash(
  playbookDir: string
): Promise<PlaybookHashInfo> {
  const hashInfo = await calculatePlaybookHash(playbookDir);
  await writePlaybookHash(playbookDir, hashInfo);
  return hashInfo;
}
