/**
 * Filesystem-Native Storage Implementation
 *
 * Handles reading and writing YAML files for the new storage structure.
 * Separates authored config from runtime state.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

/**
 * Substitute `${VAR}` / `${VAR:-default}` on string scalars in a parsed YAML
 * tree. Walking the parsed tree (instead of regex-replacing the raw source)
 * means comments and non-string values cannot trip the resolver.
 *
 * - `${VAR}`            → process.env.VAR (throws if unset unless allowMissing)
 * - `${VAR:-default}`   → process.env.VAR ?? "default"
 * - `$$` is left literal so values that genuinely contain `$$` don't get mangled.
 *
 * When `allowMissing` is true, unset vars without a default resolve to "" —
 * used by --dry runs and `converge doctor`.
 */
function interpolateEnv(
  value: unknown,
  sourcePath: string,
  allowMissing: boolean,
): unknown {
  if (typeof value === "string") {
    return value.replace(
      /\$(\$)|\$\{([A-Z0-9_]+)(?::-([^}]*))?\}/g,
      (_match, dollar, name, fallback) => {
        if (dollar) return "$";
        const envValue = process.env[name];
        if (envValue !== undefined) return envValue;
        if (fallback !== undefined) return fallback;
        if (allowMissing) return "";
        throw new Error(
          `${sourcePath}: ${name} is not set. Add it to .env.local or export it before running the CLI.`,
        );
      },
    );
  }
  if (Array.isArray(value)) {
    return value.map((v) => interpolateEnv(v, sourcePath, allowMissing));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = interpolateEnv(v, sourcePath, allowMissing);
    }
    return out;
  }
  return value;
}
import {
  ProjectConfig,
  ProjectConfigSchema,
  PlaybookConfig,
  PlaybookConfigSchema,
  PlaybookStatus,
  PlaybookStatusSchema,
  PlaybookDeps,
  PlaybookDepsSchema,
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
} from "./types.ts";

/**
 * Bundler-opaque wrapper around `import(variable)`.
 *
 * Statically analyzed bundlers (Turbopack, webpack) reject expressions
 * like `await import(somePath)` because they can't resolve the module
 * at build time — they error with `Module not found: Can't resolve
 * <dynamic>`. Routing the import through a `Function`-constructed
 * trampoline hides the syntax tree from the analyzer; the call still
 * resolves correctly at runtime in Node.js, where it's actually
 * needed.
 *
 * Used by `loadSubtasks()` to load TypeScript task definitions
 * discovered at runtime from the filesystem.
 */
const dynamicImport: (p: string) => Promise<any> = new Function(
  "p",
  "return import(p)",
) as any;

/* ------------------------------------------------------------------ */
/*  Filesystem Storage Class                                          */
/* ------------------------------------------------------------------ */

export class FilesystemStorage {
  readonly paths: StoragePaths;

  constructor(convergeDir: string = ".converge") {
    this.paths = createStoragePaths(convergeDir);
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Initialization                                                */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Initialize a new .converge/ directory structure
   */
  init(): void {
    const dirs = [
      this.paths.root,
      this.paths.playbooks,
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
      writeFileSync(gitignorePath, gitignoreContent, "utf8");
    }

    // Create .gitkeep files
    writeFileSync(`${this.paths.checkpoints}/.gitkeep`, "", "utf8");
    writeFileSync(`${this.paths.gaps}/.gitkeep`, "", "utf8");
  }

  /**
   * Check if .converge/ directory is initialized
   */
  isInitialized(): boolean {
    return existsSync(this.paths.root) && existsSync(this.paths.project);
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Project Configuration                                         */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Read project configuration.
   *
   * `allowMissingEnv` skips throwing on unset ${VAR} placeholders — used by
   * `--dry` and `converge doctor`, which validate config shape without
   * requiring credentials.
   */
  readProject(opts: { allowMissingEnv?: boolean } = {}): ProjectConfig {
    const content = readFileSync(this.paths.project, "utf8");
    const parsed = parseYaml(content);
    // Honor the per-call flag, or the process-wide opt-in used by
    // dry-runs and `converge doctor` (set in main.ts before any storage
    // is constructed).
    const allowMissing =
      opts.allowMissingEnv ?? process.env.CONVERGE_ALLOW_MISSING_ENV === "1";
    const interpolated = interpolateEnv(
      parsed,
      this.paths.project,
      allowMissing,
    );
    return ProjectConfigSchema.parse(interpolated);
  }

  /**
   * Write project configuration
   */
  writeProject(config: ProjectConfig): void {
    const validated = ProjectConfigSchema.parse(config);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(this.paths.project);
    writeFileSync(this.paths.project, content, "utf8");
  }

  /**
   * Check if project configuration exists
   */
  hasProject(): boolean {
    return existsSync(this.paths.project);
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Playbook Operations                                            */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Read playbook configuration
   */
  readPlaybookConfig(playbookId: string): PlaybookConfig {
    const path = this.paths.playbookConfig(playbookId);
    const content = readFileSync(path, "utf8");
    const data = parseYaml(content);
    return PlaybookConfigSchema.parse(data);
  }

  /**
   * Write playbook configuration
   */
  writePlaybookConfig(config: PlaybookConfig): void {
    const validated = PlaybookConfigSchema.parse(config);
    const path = this.paths.playbookConfig(config.id);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, "utf8");
  }

  /**
   * Read playbook status (runtime state)
   */
  readPlaybookStatus(playbookId: string): PlaybookStatus | null {
    const path = this.paths.playbookStatus(playbookId);
    if (!existsSync(path)) return null;

    const content = readFileSync(path, "utf8");
    const data = parseYaml(content);
    return PlaybookStatusSchema.parse(data);
  }

  /**
   * Write playbook status (runtime state)
   */
  writePlaybookStatus(status: PlaybookStatus): void {
    const validated = PlaybookStatusSchema.parse(status);
    const path = this.paths.playbookStatus(status.id);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, "utf8");
  }

  /**
   * Read playbook dependencies
   */
  readPlaybookDeps(playbookId: string): PlaybookDeps | null {
    const path = this.paths.playbookDeps(playbookId);
    if (!existsSync(path)) return null;

    const content = readFileSync(path, "utf8");
    const data = parseYaml(content);
    return PlaybookDepsSchema.parse(data);
  }

  /**
   * Write playbook dependencies
   */
  writePlaybookDeps(deps: PlaybookDeps): void {
    const validated = PlaybookDepsSchema.parse(deps);
    const path = this.paths.playbookDeps(deps.id);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, "utf8");
  }

  /**
   * Append to playbook log
   */
  appendPlaybookLog(playbookId: string, message: string): void {
    const path = this.paths.playbookLog(playbookId);
    const timestamp = new Date().toISOString();
    const entry = `\n## ${timestamp}\n\n${message}\n`;

    this.ensureDir(path);

    if (existsSync(path)) {
      const existing = readFileSync(path, "utf8");
      writeFileSync(path, existing + entry, "utf8");
    } else {
      const header = `# Playbook Log: ${playbookId}\n`;
      writeFileSync(path, header + entry, "utf8");
    }
  }

  /**
   * List all playbook IDs
   */
  listPlaybooks(): string[] {
    if (!existsSync(this.paths.playbooks)) return [];

    return readdirSync(this.paths.playbooks)
      .filter(
        (file) =>
          file.endsWith(".yaml") &&
          !file.includes(".status") &&
          !file.includes(".deps"),
      )
      .map((file) => file.replace(".yaml", ""));
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Task Operations                                               */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Read task configuration
   */
  readTaskConfig(playbookId: string, taskId: string): TaskConfig {
    const path = this.paths.taskConfig(playbookId, taskId);
    const content = readFileSync(path, "utf8");
    const data = parseYaml(content);
    return TaskConfigSchema.parse(data);
  }

  /**
   * Write task configuration
   */
  writeTaskConfig(playbookId: string, config: TaskConfig): void {
    const validated = TaskConfigSchema.parse(config);
    const path = this.paths.taskConfig(playbookId, config.id);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, "utf8");
  }

  /**
   * Read task status (runtime state)
   */
  readTaskStatus(playbookId: string, taskId: string): TaskStatus | null {
    const path = this.paths.taskStatus(playbookId, taskId);
    if (!existsSync(path)) return null;

    const content = readFileSync(path, "utf8");
    const data = parseYaml(content);
    return TaskStatusSchema.parse(data);
  }

  /**
   * Write task status (runtime state)
   */
  writeTaskStatus(playbookId: string, status: TaskStatus): void {
    const validated = TaskStatusSchema.parse(status);
    const path = this.paths.taskStatus(playbookId, status.id);
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, "utf8");
  }

  /**
   * Append to task log
   */
  appendTaskLog(playbookId: string, taskId: string, message: string): void {
    const path = this.paths.taskLog(playbookId, taskId);
    const timestamp = new Date().toISOString();
    const entry = `\n## ${timestamp}\n\n${message}\n`;

    this.ensureDir(path);

    if (existsSync(path)) {
      const existing = readFileSync(path, "utf8");
      writeFileSync(path, existing + entry, "utf8");
    } else {
      const header = `# Task Log: ${taskId}\n`;
      writeFileSync(path, header + entry, "utf8");
    }
  }

  /**
   * List all task IDs for a playbook
   */
  listTasks(playbookId: string): string[] {
    const tasksDir = this.paths.playbookTasks(playbookId);
    if (!existsSync(tasksDir)) return [];

    return readdirSync(tasksDir)
      .filter((file) => file.endsWith(".yaml") && !file.includes(".status"))
      .map((file) => file.replace(".yaml", ""));
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Gap Operations                                                */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Write gap snapshot
   */
  writeGapSnapshot(snapshot: GapSnapshot): void {
    const validated = GapSnapshotSchema.parse(snapshot);
    const filename = `${snapshot.timestamp.replace(/[:.]/g, "-")}.yaml`;
    const path = `${this.paths.gaps}/${filename}`;
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, "utf8");
  }

  /**
   * Read latest gap snapshot
   */
  readLatestGapSnapshot(): GapSnapshot | null {
    if (!existsSync(this.paths.gaps)) return null;

    const files = readdirSync(this.paths.gaps)
      .filter((f) => f.endsWith(".yaml"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const path = `${this.paths.gaps}/${files[0]}`;
    const content = readFileSync(path, "utf8");
    const data = parseYaml(content);
    return GapSnapshotSchema.parse(data);
  }

  /**
   * List all gap snapshots
   */
  listGapSnapshots(): string[] {
    if (!existsSync(this.paths.gaps)) return [];

    return readdirSync(this.paths.gaps)
      .filter((f) => f.endsWith(".yaml"))
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
    const filename = `${checkpoint.timestamp.replace(/[:.]/g, "-")}.yaml`;
    const path = `${this.paths.checkpoints}/${filename}`;
    const content = stringifyYaml(validated, { lineWidth: 0 });
    this.ensureDir(path);
    writeFileSync(path, content, "utf8");
  }

  /**
   * Read latest checkpoint
   */
  readLatestCheckpoint(): Checkpoint | null {
    if (!existsSync(this.paths.checkpoints)) return null;

    const files = readdirSync(this.paths.checkpoints)
      .filter((f) => f.endsWith(".yaml"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const path = `${this.paths.checkpoints}/${files[0]}`;
    const content = readFileSync(path, "utf8");
    const data = parseYaml(content);
    return CheckpointSchema.parse(data);
  }

  /**
   * List all checkpoints
   */
  listCheckpoints(): string[] {
    if (!existsSync(this.paths.checkpoints)) return [];

    return readdirSync(this.paths.checkpoints)
      .filter((f) => f.endsWith(".yaml"))
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
    writeFileSync(path, content, "utf8");
  }

  /**
   * Read provenance record
   */
  readProvenance(entityId: string): ProvenanceRecord | null {
    const path = `${this.paths.provenance}/${entityId}.yaml`;
    if (!existsSync(path)) return null;

    const content = readFileSync(path, "utf8");
    const data = parseYaml(content);
    return ProvenanceRecordSchema.parse(data);
  }

  /**
   * List all provenance records
   */
  listProvenance(): string[] {
    if (!existsSync(this.paths.provenance)) return [];

    return readdirSync(this.paths.provenance)
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => f.replace(".yaml", ""));
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
    playbookId: string,
    parentTaskId: string,
  ): Promise<TaskConfig[]> {
    const parentTaskDir = join(
      this.paths.playbooks,
      playbookId,
      "tasks",
      parentTaskId,
    );

    if (!existsSync(parentTaskDir)) {
      return [];
    }

    const entries = readdirSync(parentTaskDir, { withFileTypes: true });
    const subtasks: TaskConfig[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".ts")) {
        const subtaskPath = join(parentTaskDir, entry.name);

        // Dynamically import the subtask .ts file at runtime. The
        // indirection is deliberate: a bare `import(variable)` is
        // statically analyzed by Turbopack/webpack, which rejects the
        // expression because it can't resolve a "module" at build
        // time. Routing the call through `dynamicImport` (defined at
        // module top, opaque to the bundler) tells the analyzer "this
        // is a runtime-only resolution; trust it and move on."
        const subtaskModule = await dynamicImport(subtaskPath);
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
export function createFilesystemStorage(
  convergeDir: string = ".converge",
): FilesystemStorage {
  return new FilesystemStorage(convergeDir);
}
