/**
 * Filesystem Task Status
 *
 * Derives task status directly from the journal directory structure, making
 * the filesystem the source of truth instead of arrays in the global checkpoint.
 *
 * This enables:
 * - Dynamic file discovery without stale task ID references
 * - Automatic cleanup when tasks are renamed/deleted
 * - No need to track task IDs in global checkpoint arrays
 *
 * Performance: Uses a unified cache that scans all checkpoint.json files once,
 * then serves getCompleted/getFailed/getLocked from cached sets.
 * Call invalidate() after any filesystem mutation.
 */

import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import { UnitCheckpoint } from './unit-checkpoint.ts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TaskStatus {
  /** Task identifier (full path like "epic/task" or "epic/task/subtask") */
  taskId: string;
  /** Epic identifier */
  epicId: string;
  /** Current status */
  status: 'pending' | 'running' | 'complete' | 'failed' | 'seeded' | 'interrupted' | 'partial';
  /** Number of attempts */
  attempts: number;
  /** Last attempt info */
  lastAttempt?: {
    timestamp: string;
    outcome: 'success' | 'failed' | 'interrupted';
  };
}

/* ------------------------------------------------------------------ */
/*  Cache shape                                                        */
/* ------------------------------------------------------------------ */

interface StatusCacheEntry {
  status: UnitCheckpoint['status'];
  attempts: number;
  lastAttempt?: TaskStatus['lastAttempt'];
  /** Absolute path to the checkpoint.json file that was scanned */
  checkpointPath?: string;
}

interface StatusCache {
  /** All scanned statuses keyed by "epicId/taskPath" */
  allStatuses: Map<string, StatusCacheEntry>;
  completed: Set<string>;
  failed: Set<string>;
  locked: Set<string>;
  valid: boolean;
}

/* ------------------------------------------------------------------ */
/*  Filesystem Status Reader                                          */
/* ------------------------------------------------------------------ */

export class FilesystemTaskStatus {
  private journalDir: string;

  private _cache: StatusCache = {
    allStatuses: new Map(),
    completed: new Set(),
    failed: new Set(),
    locked: new Set(),
    valid: false,
  };

  constructor(projectDir: string) {
    this.journalDir = path.join(projectDir, '.harness', 'journal');
  }

  /**
   * Invalidate cache. Next read will trigger a full rescan.
   */
  invalidate(): void {
    this._cache.valid = false;
  }

  /**
   * Get task status by reading journal directory structure.
   * Returns status based on per-task checkpoint if exists, otherwise 'pending'.
   */
  async getTaskStatus(epicId: string, taskId: string): Promise<TaskStatus> {
    this.ensureCache();

    const cached = this.findCachedEntry(epicId, taskId);

    if (cached) {
      return {
        taskId,
        epicId,
        status: cached.status,
        attempts: cached.attempts,
        lastAttempt: cached.lastAttempt,
      };
    }

    return {
      taskId,
      epicId,
      status: 'pending',
      attempts: 0,
    };
  }

  /**
   * Get the on-disk checkpoint path for a task (if it exists in the cache).
   * Used by reconcileTask to update the SAME file the scanner found.
   */
  getCheckpointPath(epicId: string, taskId: string): string | undefined {
    this.ensureCache();
    return this.findCachedEntry(epicId, taskId)?.checkpointPath;
  }

  /**
   * Get ALL on-disk checkpoint paths for a task (handles duplicates across
   * journal roots like journal/default/ and journal/create-web/).
   */
  getAllCheckpointPaths(epicId: string, taskId: string): string[] {
    this.ensureCache();
    const qualifiedKey = `${epicId}/${taskId}`;
    const paths: string[] = [];
    for (const [key, entry] of this._cache.allStatuses) {
      if (!entry.checkpointPath) continue;
      if (key === qualifiedKey || key === taskId) {
        paths.push(entry.checkpointPath);
        continue;
      }
      if (key.includes('/')) {
        const stripped = key.split('/').slice(1).join('/');
        if (stripped === qualifiedKey || stripped === taskId) {
          paths.push(entry.checkpointPath);
        }
      }
    }
    return paths;
  }

  /**
   * Get all completed task IDs by scanning journal structure.
   * Returns a Set of task IDs in the format "epicId/taskId".
   */
  async getCompletedTaskIds(): Promise<Set<string>> {
    this.ensureCache();
    return this._cache.completed;
  }

  /**
   * Get all failed task IDs by scanning journal structure.
   */
  async getFailedTaskIds(): Promise<Set<string>> {
    this.ensureCache();
    return this._cache.failed;
  }

  /**
   * Get all locked task IDs (completed, failed, or seeded).
   * Returns a Set of task IDs in the format "epicId/taskId".
   */
  async getLockedTaskIds(): Promise<Set<string>> {
    this.ensureCache();
    return this._cache.locked;
  }

  /**
   * Get all statuses as a Map for O(1) lookup.
   * Keys include both "taskPath" and "epicId/taskPath" for each entry.
   */
  getStatusMap(): Map<string, string> {
    this.ensureCache();
    const map = new Map<string, string>();
    for (const [key, entry] of this._cache.allStatuses) {
      map.set(key, entry.status);
      // Also add the taskPath portion (strip epicId prefix) for tree-node lookups
      if (key.includes('/')) {
        const taskPart = key.split('/').slice(1).join('/');
        if (taskPart && !map.has(taskPart)) {
          map.set(taskPart, entry.status);
        }
      }
    }
    return map;
  }

  /**
   * Check if a task is locked (completed, failed, or seeded).
   * Locked tasks won't be re-run by the harness engine.
   */
  async isTaskLocked(epicId: string, taskId: string): Promise<boolean> {
    const status = await this.getTaskStatus(epicId, taskId);
    return ['complete', 'failed', 'seeded'].includes(status.status);
  }

  /* ── Private ─────────────────────────────────────────────────── */

  /**
   * Look up a cache entry by trying multiple key formats.
   * Checkpoints may live under a different journal root (e.g. journal/default/)
   * than the epicId suggests (e.g. create-web). This tries:
   *   1. epicId/taskId  (direct match)
   *   2. taskId         (bare taskId)
   *   3. Scan all keys whose stripped suffix matches epicId/taskId
   */
  private findCachedEntry(epicId: string, taskId: string): StatusCacheEntry | undefined {
    const qualifiedKey = `${epicId}/${taskId}`;
    const direct = this._cache.allStatuses.get(qualifiedKey) ?? this._cache.allStatuses.get(taskId);
    if (direct) return direct;

    // Fallback: scan for any key whose suffix (after stripping the first segment)
    // matches the qualifiedKey. This handles journal/default/create-web/... matching
    // a lookup for create-web/...
    for (const [key, entry] of this._cache.allStatuses) {
      if (key.includes('/')) {
        const stripped = key.split('/').slice(1).join('/');
        if (stripped === qualifiedKey || stripped === taskId) {
          return entry;
        }
      }
    }
    return undefined;
  }

  /**
   * Populate cache if not valid.
   */
  private ensureCache(): void {
    if (this._cache.valid) return;

    this._cache.allStatuses.clear();
    this._cache.completed.clear();
    this._cache.failed.clear();
    this._cache.locked.clear();

    // Scan legacy journal/epics/ structure
    const epicsDir = path.join(this.journalDir, 'epics');
    if (existsSync(epicsDir)) {
      this.scanEpicsDirectory(epicsDir);
    }

    // Scan playbook journal structure: journal/{playbook}/tasks/
    // Each top-level directory in journal/ that has a tasks/ subdirectory is a playbook
    if (existsSync(this.journalDir)) {
      for (const entry of readdirSync(this.journalDir)) {
        if (entry === 'epics' || entry === 'project') continue;
        const playbookDir = path.join(this.journalDir, entry);
        if (!statSync(playbookDir).isDirectory()) continue;
        const tasksDir = path.join(playbookDir, 'tasks');
        if (!existsSync(tasksDir) || !statSync(tasksDir).isDirectory()) continue;

        // For playbook projects, tasks/ contains tasks directly (not epic subdirs).
        // The playbook name serves as the epicId namespace.
        this.scanPlaybookTasksDirectory(tasksDir, entry);
      }
    }

    this._cache.valid = true;
  }

  /**
   * Scan an epics-style directory (journal/epics/ or journal/{playbook}/tasks/)
   * for checkpoint files.
   */
  private scanEpicsDirectory(epicsDir: string): void {
    for (const epicId of readdirSync(epicsDir)) {
      const epicDir = path.join(epicsDir, epicId);
      if (!statSync(epicDir).isDirectory()) continue;

      // Check epic-level checkpoint
      const epicCheckpoint = path.join(epicDir, 'checkpoint.json');
      if (existsSync(epicCheckpoint)) {
        this.cacheCheckpointFile(epicCheckpoint, epicId, epicId);
      }

      // Scan tasks in this epic
      this.scanAllStatusesInDirectory(epicDir, epicId, '');
    }
  }

  /**
   * Scan a playbook tasks directory (journal/{playbook}/tasks/).
   * Unlike epics, playbook tasks are flat — no intermediate epic directory.
   * The playbook name is used as the epicId for cache keys.
   * Children are nested directly (no tasks/ subdirectory between levels).
   */
  private scanPlaybookTasksDirectory(tasksDir: string, playbookName: string): void {
    this.scanFlatDirectory(tasksDir, playbookName, '');
  }

  /**
   * Single recursive scanner that populates all cache sets at once.
   */
  private scanAllStatusesInDirectory(
    dir: string,
    epicId: string,
    parentPath: string,
  ): void {
    for (const entry of readdirSync(dir)) {
      const entryPath = path.join(dir, entry);
      if (!statSync(entryPath).isDirectory()) continue;

      // Skip internal directories
      if (entry === 'attempts' || entry === 'logs') continue;

      // 'tasks' is structural — recurse without adding to path
      if (entry === 'tasks') {
        this.scanAllStatusesInDirectory(entryPath, epicId, parentPath);
        continue;
      }

      const taskPath = parentPath ? `${parentPath}/${entry}` : entry;

      // Check checkpoint
      const checkpointPath = path.join(entryPath, 'checkpoint.json');
      if (existsSync(checkpointPath)) {
        this.cacheCheckpointFile(checkpointPath, epicId, taskPath);
      }

      // Recurse into tasks/ subdirectory for WBS subtasks
      const tasksSubdir = path.join(entryPath, 'tasks');
      if (existsSync(tasksSubdir) && statSync(tasksSubdir).isDirectory()) {
        this.scanAllStatusesInDirectory(tasksSubdir, epicId, taskPath);
      }
    }
  }

  /**
   * Flat recursive scanner for playbook journals where children are nested
   * directly under parents (no tasks/ subdirectory between levels).
   */
  private scanFlatDirectory(
    dir: string,
    epicId: string,
    parentPath: string,
  ): void {
    for (const entry of readdirSync(dir)) {
      const entryPath = path.join(dir, entry);
      if (!statSync(entryPath).isDirectory()) continue;

      // Skip internal directories
      if (entry === 'attempts' || entry === 'logs' || entry === 'sessions') continue;

      // 'tasks' is structural — recurse without adding to path
      // (mirrors scanAllStatusesInDirectory behaviour so cache keys
      //  match tree-node IDs which never contain '/tasks/' segments)
      if (entry === 'tasks') {
        this.scanFlatDirectory(entryPath, epicId, parentPath);
        continue;
      }

      const taskPath = parentPath ? `${parentPath}/${entry}` : entry;

      // Check checkpoint
      const checkpointPath = path.join(entryPath, 'checkpoint.json');
      if (existsSync(checkpointPath)) {
        this.cacheCheckpointFile(checkpointPath, epicId, taskPath);
      }

      // Recurse into all child directories (flat hierarchy)
      this.scanFlatDirectory(entryPath, epicId, taskPath);
    }
  }

  /**
   * Read a checkpoint.json and populate all cache fields.
   */
  private cacheCheckpointFile(checkpointPath: string, epicId: string, taskPath: string): void {
    try {
      const checkpoint = JSON.parse(
        readFileSync(checkpointPath, 'utf-8')
      ) as UnitCheckpoint;

      const key = `${epicId}/${taskPath}`;
      const attempts = checkpoint.attempts?.length || 0;
      const lastAttempt = checkpoint.attempts?.[attempts - 1];

      this._cache.allStatuses.set(key, {
        status: checkpoint.status,
        attempts,
        lastAttempt: lastAttempt
          ? {
              timestamp: lastAttempt.completedAt || lastAttempt.startedAt,
              outcome: lastAttempt.outcome || 'success',
            }
          : undefined,
        checkpointPath,
      });

      if (checkpoint.status === 'complete') {
        this._cache.completed.add(key);
      }
      if (checkpoint.status === 'failed') {
        this._cache.failed.add(key);
      }
      if (['complete', 'failed', 'seeded'].includes(checkpoint.status)) {
        this._cache.locked.add(key);
      }
    } catch {
      // Ignore malformed checkpoints
    }
  }

  /**
   * Get the journal path for a task (mirrors epic folder structure).
   */
  private getTaskJournalPath(epicId: string, taskId: string): string {
    // Mirror the structure from unit-checkpoint.ts
    const segments = taskId.split('/').filter(Boolean);

    // Epic-level task: when first segment equals epicId, the epic IS the task.
    if (segments[0] === epicId) {
      if (segments.length === 1) {
        return path.join(this.journalDir, 'epics', epicId);
      }
      const childSegments = segments.slice(1);
      const pathSegments: string[] = ['tasks', childSegments[0]];
      for (let i = 1; i < childSegments.length; i++) {
        pathSegments.push('tasks', childSegments[i]);
      }
      return path.join(this.journalDir, 'epics', epicId, ...pathSegments);
    }

    const pathSegments: string[] = [segments[0]];
    // WBS subtasks use tasks/ subdirectory
    for (let i = 1; i < segments.length; i++) {
      pathSegments.push('tasks', segments[i]);
    }

    return path.join(this.journalDir, 'epics', epicId, ...pathSegments);
  }
}
