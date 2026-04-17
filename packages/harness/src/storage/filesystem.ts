/**
 * Filesystem-Native Storage Implementation
 *
 * Handles reading and writing YAML files for the new storage structure.
 * Separates authored config from runtime state.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  ProjectConfig,
  ProjectConfigSchema,
  EpicConfig,
  EpicConfigSchema,
  EpicStatus,
  EpicStatusSchema,
  EpicDeps,
  EpicDepsSchema,
  TaskConfig,
  TaskConfigSchema,
  TaskStatus,
  TaskStatusSchema,
  Gap,
  GapSchema,
  GapSnapshot,
  GapSnapshotSchema,
  Checkpoint,
  CheckpointSchema,
  ProvenanceRecord,
  ProvenanceRecordSchema,
  StoragePaths,
  createStoragePaths,
} from './types.ts';

/* ------------------------------------------------------------------ */
/*  Filesystem Storage Class                                          */
/* ------------------------------------------------------------------ */

export class FilesystemStorage {
  readonly paths: StoragePaths;

  constructor(crewDir: string = '.crew') {
    this.paths = createStoragePaths(crewDir);
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Initialization                                                */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Initialize a new .harness/ directory structure
   */
  init(): void {
    const dirs = [
      this.paths.root,
      this.paths.epics,
      this.paths.checkpoints,
      this.paths.gaps,
      this.paths.provenance,
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    // Create .gitignore for runtime files
    const gitignorePath = `${this.paths.root}/.gitignore`;
    if (!existsSync(gitignorePath)) {
      const gitignoreContent = `# Runtime state (gitignored by default)
*.status.yaml
*.log.md
gaps/
checkpoints/*.yaml

# Keep checkpoint directory structure
!checkpoints/.gitkeep
!gaps/.gitkeep
`;
      writeFileSync(gitignorePath, gitignoreContent, 'utf8');
    }

    // Create .gitkeep files
    writeFileSync(`${this.paths.checkpoints}/.gitkeep`, '', 'utf8');
    writeFileSync(`${this.paths.gaps}/.gitkeep`, '', 'utf8');
  }

  /**
   * Check if .harness/ directory is initialized
   */
  isInitialized(): boolean {
    return existsSync(this.paths.root) && existsSync(this.paths.project);
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Project Configuration                                         */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Read project configuration
   */
  readProject(): ProjectConfig {
    const content = readFileSync(this.paths.project, 'utf8');
    const data = parseYaml(content);
    return ProjectConfigSchema.parse(data);
  }

  /**
   * Write project configuration
   */
  writeProject(config: ProjectConfig): void {
    const validated = ProjectConfigSchema.parse(config);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(this.paths.project);
    writeFileSync(this.paths.project, content, 'utf8');
  }

  /**
   * Check if project configuration exists
   */
  hasProject(): boolean {
    return existsSync(this.paths.project);
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Epic Operations                                               */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Read epic configuration
   */
  readEpicConfig(epicId: string): EpicConfig {
    const path = this.paths.epicConfig(epicId);
    const content = readFileSync(path, 'utf8');
    const data = parseYaml(content);
    return EpicConfigSchema.parse(data);
  }

  /**
   * Write epic configuration
   */
  writeEpicConfig(config: EpicConfig): void {
    const validated = EpicConfigSchema.parse(config);
    const path = this.paths.epicConfig(config.id);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, 'utf8');
  }

  /**
   * Read epic status (runtime state)
   */
  readEpicStatus(epicId: string): EpicStatus | null {
    const path = this.paths.epicStatus(epicId);
    if (!existsSync(path)) return null;

    const content = readFileSync(path, 'utf8');
    const data = parseYaml(content);
    return EpicStatusSchema.parse(data);
  }

  /**
   * Write epic status (runtime state)
   */
  writeEpicStatus(status: EpicStatus): void {
    const validated = EpicStatusSchema.parse(status);
    const path = this.paths.epicStatus(status.id);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, 'utf8');
  }

  /**
   * Read epic dependencies
   */
  readEpicDeps(epicId: string): EpicDeps | null {
    const path = this.paths.epicDeps(epicId);
    if (!existsSync(path)) return null;

    const content = readFileSync(path, 'utf8');
    const data = parseYaml(content);
    return EpicDepsSchema.parse(data);
  }

  /**
   * Write epic dependencies
   */
  writeEpicDeps(deps: EpicDeps): void {
    const validated = EpicDepsSchema.parse(deps);
    const path = this.paths.epicDeps(deps.id);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, 'utf8');
  }

  /**
   * Append to epic log
   */
  appendEpicLog(epicId: string, message: string): void {
    const path = this.paths.epicLog(epicId);
    const timestamp = new Date().toISOString();
    const entry = `\n## ${timestamp}\n\n${message}\n`;

    this.ensureDir(path);

    if (existsSync(path)) {
      const existing = readFileSync(path, 'utf8');
      writeFileSync(path, existing + entry, 'utf8');
    } else {
      const header = `# Epic Log: ${epicId}\n`;
      writeFileSync(path, header + entry, 'utf8');
    }
  }

  /**
   * List all epic IDs
   */
  listEpics(): string[] {
    if (!existsSync(this.paths.epics)) return [];

    return readdirSync(this.paths.epics)
      .filter((file) => file.endsWith('.yaml') && !file.includes('.status') && !file.includes('.deps'))
      .map((file) => file.replace('.yaml', ''));
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Task Operations                                               */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Read task configuration
   */
  readTaskConfig(epicId: string, taskId: string): TaskConfig {
    const path = this.paths.taskConfig(epicId, taskId);
    const content = readFileSync(path, 'utf8');
    const data = parseYaml(content);
    return TaskConfigSchema.parse(data);
  }

  /**
   * Write task configuration
   */
  writeTaskConfig(epicId: string, config: TaskConfig): void {
    const validated = TaskConfigSchema.parse(config);
    const path = this.paths.taskConfig(epicId, config.id);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, 'utf8');
  }

  /**
   * Read task status (runtime state)
   */
  readTaskStatus(epicId: string, taskId: string): TaskStatus | null {
    const path = this.paths.taskStatus(epicId, taskId);
    if (!existsSync(path)) return null;

    const content = readFileSync(path, 'utf8');
    const data = parseYaml(content);
    return TaskStatusSchema.parse(data);
  }

  /**
   * Write task status (runtime state)
   */
  writeTaskStatus(epicId: string, status: TaskStatus): void {
    const validated = TaskStatusSchema.parse(status);
    const path = this.paths.taskStatus(epicId, status.id);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, 'utf8');
  }

  /**
   * Append to task log
   */
  appendTaskLog(epicId: string, taskId: string, message: string): void {
    const path = this.paths.taskLog(epicId, taskId);
    const timestamp = new Date().toISOString();
    const entry = `\n## ${timestamp}\n\n${message}\n`;

    this.ensureDir(path);

    if (existsSync(path)) {
      const existing = readFileSync(path, 'utf8');
      writeFileSync(path, existing + entry, 'utf8');
    } else {
      const header = `# Task Log: ${taskId}\n`;
      writeFileSync(path, header + entry, 'utf8');
    }
  }

  /**
   * List all task IDs for an epic
   */
  listTasks(epicId: string): string[] {
    const tasksDir = this.paths.epicTasks(epicId);
    if (!existsSync(tasksDir)) return [];

    return readdirSync(tasksDir)
      .filter((file) => file.endsWith('.yaml') && !file.includes('.status'))
      .map((file) => file.replace('.yaml', ''));
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Gap Operations                                                */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Write gap snapshot
   */
  writeGapSnapshot(snapshot: GapSnapshot): void {
    const validated = GapSnapshotSchema.parse(snapshot);
    const filename = `${snapshot.timestamp.replace(/[:.]/g, '-')}.yaml`;
    const path = `${this.paths.gaps}/${filename}`;
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, 'utf8');
  }

  /**
   * Read latest gap snapshot
   */
  readLatestGapSnapshot(): GapSnapshot | null {
    if (!existsSync(this.paths.gaps)) return null;

    const files = readdirSync(this.paths.gaps)
      .filter((f) => f.endsWith('.yaml'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const path = `${this.paths.gaps}/${files[0]}`;
    const content = readFileSync(path, 'utf8');
    const data = parseYaml(content);
    return GapSnapshotSchema.parse(data);
  }

  /**
   * List all gap snapshots
   */
  listGapSnapshots(): string[] {
    if (!existsSync(this.paths.gaps)) return [];

    return readdirSync(this.paths.gaps)
      .filter((f) => f.endsWith('.yaml'))
      .sort();
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Checkpoint Operations                                         */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Write checkpoint
   */
  writeCheckpoint(checkpoint: Checkpoint): void {
    const validated = CheckpointSchema.parse(checkpoint);
    const filename = `${checkpoint.timestamp.replace(/[:.]/g, '-')}.yaml`;
    const path = `${this.paths.checkpoints}/${filename}`;
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, 'utf8');
  }

  /**
   * Read latest checkpoint
   */
  readLatestCheckpoint(): Checkpoint | null {
    if (!existsSync(this.paths.checkpoints)) return null;

    const files = readdirSync(this.paths.checkpoints)
      .filter((f) => f.endsWith('.yaml'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const path = `${this.paths.checkpoints}/${files[0]}`;
    const content = readFileSync(path, 'utf8');
    const data = parseYaml(content);
    return CheckpointSchema.parse(data);
  }

  /**
   * List all checkpoints
   */
  listCheckpoints(): string[] {
    if (!existsSync(this.paths.checkpoints)) return [];

    return readdirSync(this.paths.checkpoints)
      .filter((f) => f.endsWith('.yaml'))
      .sort();
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Provenance Operations                                         */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Write provenance record
   */
  writeProvenance(record: ProvenanceRecord): void {
    const validated = ProvenanceRecordSchema.parse(record);
    const filename = `${record.entityId}.yaml`;
    const path = `${this.paths.provenance}/${filename}`;
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, 'utf8');
  }

  /**
   * Read provenance record
   */
  readProvenance(entityId: string): ProvenanceRecord | null {
    const path = `${this.paths.provenance}/${entityId}.yaml`;
    if (!existsSync(path)) return null;

    const content = readFileSync(path, 'utf8');
    const data = parseYaml(content);
    return ProvenanceRecordSchema.parse(data);
  }

  /**
   * List all provenance records
   */
  listProvenance(): string[] {
    if (!existsSync(this.paths.provenance)) return [];

    return readdirSync(this.paths.provenance)
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.replace('.yaml', ''));
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Utilities                                                     */
  /* ────────────────────────────────────────────────────────────── */
  /*  Subtask Operations                                            */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Read all subtask configs from parent task subdirectory
   * Subtasks are .ts files that export default taskDef()
   */
  async readSubtaskConfigs(
    epicId: string,
    parentTaskId: string
  ): Promise<TaskConfig[]> {
    const parentTaskDir = join(this.paths.epics, epicId, 'tasks', parentTaskId);

    if (!existsSync(parentTaskDir)) {
      return [];
    }

    const entries = readdirSync(parentTaskDir, { withFileTypes: true });
    const subtasks: TaskConfig[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        const subtaskPath = join(parentTaskDir, entry.name);

        // Dynamically import the subtask .ts file
        const subtaskModule = await import(subtaskPath);
        const config = subtaskModule.default as TaskConfig;

        subtasks.push(config);
      }
    }

    return subtasks.sort((a, b) => a.id.localeCompare(b.id));
  }

  /* ────────────────────────────────────────────────────────────── */

  /**
   * Ensure directory exists for a file path
   */
  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Function                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a new filesystem storage instance
 */
export function createFilesystemStorage(crewDir: string = '.crew'): FilesystemStorage {
  return new FilesystemStorage(crewDir);
}
