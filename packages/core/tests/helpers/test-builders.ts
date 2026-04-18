/**
 * Test Builders - Entity Construction Utilities
 *
 * Provides builder functions for creating test entities with sensible defaults.
 * All builders support partial overrides for flexibility.
 */

import { randomUUID } from "node:crypto";
import type { Gap, ConvergenceState, EvalResult } from "../../src/gap/types.ts";
import type {
  TaskConfig,
  TaskStatus,
  EpicStatus,
  EpicConfig,
  ProjectConfig,
  GapType,
} from "../../src/storage/types.ts";
import type {
  ProjectContext,
  EpicContext,
  TaskContext,
  FileSystemAPI,
  ShellAPI,
  GitAPI,
  LoggerAPI,
  EvalAPI,
  PlanAPI,
  CheckAPI,
  PluginAPI,
} from "../../src/context/types.ts";

/* ------------------------------------------------------------------ */
/*  Gap Builders                                                      */
/* ------------------------------------------------------------------ */

/**
 * Create a test gap with default values
 */
export function createTestGap(overrides?: Partial<Gap>): Gap {
  const id = overrides?.id || `gap-${randomUUID().slice(0, 8)}`;
  const type = overrides?.type || "structural";
  const level = overrides?.level || "epic";
  const scope = overrides?.scope || "epic-1";

  return {
    id,
    type,
    level,
    scope,
    description: overrides?.description || `Test gap: ${id}`,
    detected: overrides?.detected || new Date().toISOString(),
    resolved: overrides?.resolved ?? false,
    resolvedAt: overrides?.resolvedAt,
    checks: overrides?.checks || ["test-check"],
    metadata: overrides?.metadata,
    severity: overrides?.severity || "medium",
    suggestedFix: overrides?.suggestedFix,
  };
}

/**
 * Create a structural gap
 */
export function createStructuralGap(description?: string): Gap {
  return createTestGap({
    type: "structural",
    description: description || "Missing required file or directory",
    severity: "high",
  });
}

/**
 * Create a quality gap
 */
export function createQualityGap(description?: string): Gap {
  return createTestGap({
    type: "quality",
    description: description || "Code quality issue detected",
    severity: "medium",
  });
}

/**
 * Create a semantic gap
 */
export function createSemanticGap(description?: string): Gap {
  return createTestGap({
    type: "semantic",
    description: description || "Semantic requirement not met",
    severity: "high",
  });
}

/**
 * Create an integration gap
 */
export function createIntegrationGap(description?: string): Gap {
  return createTestGap({
    type: "integration",
    description: description || "Integration test failure",
    severity: "critical",
  });
}

/**
 * Create a blocking gap (critical severity)
 */
export function createBlockingGap(): Gap {
  return createTestGap({
    severity: "critical",
    description: "Blocking issue must be resolved",
  });
}

/* ------------------------------------------------------------------ */
/*  Task Builders                                                     */
/* ------------------------------------------------------------------ */

/**
 * Create a test task config
 */
export function createTestTask(overrides?: Partial<TaskConfig>): TaskConfig {
  const id = overrides?.id || `task-${randomUUID().slice(0, 8)}`;

  return {
    id,
    title: overrides?.title || `Test Task ${id}`,
    description: overrides?.description || "Test task description",
    type: overrides?.type || "test-task",
    deps: overrides?.deps || [],
    inputs: overrides?.inputs || [],
    outputs: overrides?.outputs || [],
    checks: overrides?.checks || [],
    fn: overrides?.fn || "test-fn",
    vars: overrides?.vars || {},
    constraints: overrides?.constraints || {},
    metadata: overrides?.metadata,
  };
}

/**
 * Create an install task
 */
export function createInstallTask(): TaskConfig {
  return createTestTask({
    id: "install",
    title: "Install Dependencies",
    type: "install",
    fn: "install",
  });
}

/**
 * Create a coding task
 */
export function createCodingTask(prompt: string): TaskConfig {
  return createTestTask({
    id: `coding-${randomUUID().slice(0, 8)}`,
    title: "Generate Code",
    type: "coding",
    fn: "coding",
    vars: { prompt },
  });
}

/**
 * Create a test task
 */
export function createTestingTask(): TaskConfig {
  return createTestTask({
    id: "test",
    title: "Run Tests",
    type: "test",
    fn: "test",
  });
}

/* ------------------------------------------------------------------ */
/*  Status Builders                                                   */
/* ------------------------------------------------------------------ */

/**
 * Create a test task status
 */
export function createTestTaskStatus(state?: TaskStatus["state"]): TaskStatus {
  return {
    state: state || "pending",
    attempts: 0,
    startedAt: state !== "pending" ? new Date().toISOString() : undefined,
    completedAt: state === "completed" ? new Date().toISOString() : undefined,
    error: state === "failed" ? "Task failed" : undefined,
  };
}

/**
 * Create a test epic status
 */
export function createTestEpicStatus(state?: EpicStatus["state"]): EpicStatus {
  return {
    state: state || "pending",
    startedAt: state !== "pending" ? new Date().toISOString() : undefined,
    completedAt: state === "completed" ? new Date().toISOString() : undefined,
    currentIteration: 0,
    gaps: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Config Builders                                                   */
/* ------------------------------------------------------------------ */

/**
 * Create a test epic config
 */
export function createTestEpicConfig(
  overrides?: Partial<EpicConfig>,
): EpicConfig {
  const id = overrides?.id || `epic-${randomUUID().slice(0, 8)}`;

  return {
    id,
    name: overrides?.name || `Test Epic ${id}`,
    description: overrides?.description || "Test epic description",
    goals: overrides?.goals || [],
    deps: overrides?.deps || [],
    tasks: overrides?.tasks || [],
    vars: overrides?.vars || {},
    metadata: overrides?.metadata,
  };
}

/**
 * Create a test project config
 */
export function createTestProjectConfig(
  overrides?: Partial<ProjectConfig>,
): ProjectConfig {
  return {
    version: overrides?.version || 2,
    name: overrides?.name || "Test Project",
    description: overrides?.description || "Test project description",
    goals: overrides?.goals || [],
    epics: overrides?.epics || [],
    plugins: overrides?.plugins || [],
    vars: overrides?.vars || {},
    metadata: overrides?.metadata,
  };
}

/* ------------------------------------------------------------------ */
/*  Context Builders                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create mock filesystem API
 */
function createMockFs(): FileSystemAPI {
  const files = new Map<string, string>();

  return {
    read: async (path: string) => files.get(path) || "",
    write: async (path: string, content: string) => {
      files.set(path, content);
    },
    exists: async (path: string) => files.has(path),
    list: async (path: string, pattern?: string) => {
      const prefix = path.endsWith("/") ? path : `${path}/`;
      return Array.from(files.keys()).filter((p) => p.startsWith(prefix));
    },
    mkdir: async () => {},
    rm: async (path: string) => {
      files.delete(path);
    },
    copy: async (src: string, dest: string) => {
      const content = files.get(src);
      if (content) files.set(dest, content);
    },
  };
}

/**
 * Create mock shell API
 */
function createMockShell(): ShellAPI {
  return {
    exec: async () => ({
      exitCode: 0,
      stdout: "",
      stderr: "",
      success: true,
    }),
    stream: async () => {},
  };
}

/**
 * Create mock git API
 */
function createMockGit(): GitAPI {
  return {
    getCurrentCommit: async () => "abc123",
    getCurrentBranch: async () => "main",
    isClean: async () => true,
    getModifiedFiles: async () => [],
    getDiff: async () => "",
    commit: async () => {},
  };
}

/**
 * Create mock logger API
 */
function createMockLogger(): LoggerAPI {
  const logger: LoggerAPI = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: (prefix: string) => logger,
  };
  return logger;
}

/**
 * Create mock eval API
 */
function createMockEvalAPI(): EvalAPI {
  return {
    detectGaps: async () => ({
      gaps: [],
      summary: {
        total: 0,
        byType: { structural: 0, semantic: 0, quality: 0, integration: 0 },
        byLevel: { project: 0, epic: 0, task: 0 },
      },
      timestamp: new Date().toISOString(),
      checksRun: [],
    }),
    runChecks: async () => [],
    getCurrentGaps: async () => [],
    compareInvariants: async () => [],
  };
}

/**
 * Create mock plan API
 */
function createMockPlanAPI(): PlanAPI {
  return {
    generateTasks: async () => [],
    getNextTasks: async () => [],
    isComplete: async () => true,
  };
}

/**
 * Create mock check API
 */
function createMockCheckAPI(): CheckAPI {
  return {
    run: async () => ({
      check: "test",
      passed: true,
      gaps: [],
    }),
    runAll: async () => [],
    validateOutputs: async () => ({
      check: "outputs",
      passed: true,
      gaps: [],
    }),
  };
}

/**
 * Create mock plugin API
 */
function createMockPluginAPI(): PluginAPI {
  return {
    getLoaded: () => [],
    has: () => false,
    getConfig: () => undefined,
    getChecks: () => ({}),
    getTaskTypes: () => [],
  };
}

/**
 * Create a test project context
 */
export function createTestProjectContext(
  overrides?: Partial<ProjectContext>,
): ProjectContext {
  const config = createTestProjectConfig(overrides?.config);

  return {
    level: "project" as const,
    projectDir: overrides?.projectDir || "/test/project",
    convergeDir: overrides?.convergeDir || "/test/project/.converge",
    vars: overrides?.vars || {},
    fs: overrides?.fs || createMockFs(),
    shell: overrides?.shell || createMockShell(),
    git: overrides?.git || createMockGit(),
    log: overrides?.log || createMockLogger(),
    config,
    eval: overrides?.eval || createMockEvalAPI(),
    plan: overrides?.plan || createMockPlanAPI(),
    plugins: overrides?.plugins || createMockPluginAPI(),
  };
}

/**
 * Create a test epic context
 */
export function createTestEpicContext(
  overrides?: Partial<EpicContext> & { project?: ProjectContext },
): EpicContext {
  const project = overrides?.project || createTestProjectContext();
  const epicConfig = createTestEpicConfig(overrides?.config);
  const epicStatus = createTestEpicStatus();

  return {
    level: "epic" as const,
    epicId: overrides?.epicId || epicConfig.id,
    projectDir: overrides?.projectDir || project.projectDir,
    convergeDir: overrides?.convergeDir || project.convergeDir,
    vars: overrides?.vars || {},
    fs: overrides?.fs || createMockFs(),
    shell: overrides?.shell || createMockShell(),
    git: overrides?.git || createMockGit(),
    log: overrides?.log || createMockLogger(),
    config: epicConfig,
    status: epicStatus,
    project,
    eval: overrides?.eval || createMockEvalAPI(),
    plan: overrides?.plan || createMockPlanAPI(),
  };
}

/**
 * Create a test task context
 */
export function createTestTaskContext(
  overrides?: Partial<TaskContext> & {
    epic?: EpicContext;
    project?: ProjectContext;
  },
): TaskContext {
  const epic = overrides?.epic || createTestEpicContext();
  const project = overrides?.project || epic.project;
  const taskConfig = createTestTask(overrides?.config);
  const taskStatus = createTestTaskStatus();

  return {
    level: "task" as const,
    taskId: overrides?.taskId || taskConfig.id,
    projectDir: overrides?.projectDir || project.projectDir,
    convergeDir: overrides?.convergeDir || project.convergeDir,
    vars: overrides?.vars || {},
    fs: overrides?.fs || createMockFs(),
    shell: overrides?.shell || createMockShell(),
    git: overrides?.git || createMockGit(),
    log: overrides?.log || createMockLogger(),
    config: taskConfig,
    status: taskStatus,
    epic,
    project,
    check: overrides?.check || createMockCheckAPI(),
  };
}

/* ------------------------------------------------------------------ */
/*  Convergence State Builders                                        */
/* ------------------------------------------------------------------ */

/**
 * Create a converged state (all gaps resolved)
 */
export function createConvergedState(): ConvergenceState {
  return {
    iteration: 3,
    previousGaps: [createTestGap(), createTestGap()],
    currentGaps: [],
    newGaps: [],
    resolvedGaps: [createTestGap(), createTestGap()],
    unchangedGaps: [],
    stalled: false,
    metrics: {
      gapReductionRate: 100,
      stallThreshold: 3,
      stallCount: 0,
    },
  };
}

/**
 * Create a stalled state (no progress)
 */
export function createStalledState(): ConvergenceState {
  const gap = createTestGap();
  return {
    iteration: 5,
    previousGaps: [gap],
    currentGaps: [gap],
    newGaps: [],
    resolvedGaps: [],
    unchangedGaps: [gap],
    stalled: true,
    stallReason: "No progress for 3 consecutive iterations",
    metrics: {
      gapReductionRate: 0,
      stallThreshold: 3,
      stallCount: 3,
    },
  };
}

/**
 * Create an in-progress convergence state
 */
export function createInProgressState(): ConvergenceState {
  const resolved = createTestGap({ id: "gap-resolved" });
  const unchanged = createTestGap({ id: "gap-unchanged" });
  const newGap = createTestGap({ id: "gap-new" });

  return {
    iteration: 2,
    previousGaps: [resolved, unchanged],
    currentGaps: [unchanged, newGap],
    newGaps: [newGap],
    resolvedGaps: [resolved],
    unchangedGaps: [unchanged],
    stalled: false,
    metrics: {
      gapReductionRate: 50,
      stallThreshold: 3,
      stallCount: 0,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Eval Result Builders                                              */
/* ------------------------------------------------------------------ */

/**
 * Create a test eval result
 */
export function createTestEvalResult(gaps: Gap[] = []): EvalResult {
  const byType = {
    structural: gaps.filter((g) => g.type === "structural").length,
    semantic: gaps.filter((g) => g.type === "semantic").length,
    quality: gaps.filter((g) => g.type === "quality").length,
    integration: gaps.filter((g) => g.type === "integration").length,
  };

  const byLevel = {
    project: gaps.filter((g) => g.level === "project").length,
    epic: gaps.filter((g) => g.level === "epic").length,
    task: gaps.filter((g) => g.level === "task").length,
  };

  return {
    gaps,
    summary: {
      total: gaps.length,
      byType,
      byLevel,
    },
    timestamp: new Date().toISOString(),
    checksRun: ["test-check"],
  };
}
