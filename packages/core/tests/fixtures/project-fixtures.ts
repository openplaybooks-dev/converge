/**
 * Project Fixtures - Complete Project Scenarios
 *
 * Pre-configured project scenarios for testing different workflows.
 */

import type { ProjectConfig, EpicConfig, TaskConfig } from '../../src/storage/types.ts';
import type { Gap } from '../../src/gap/types.ts';
import {
  createTestProjectConfig,
  createTestEpicConfig,
  createTestTask,
  createStructuralGap,
  createQualityGap,
} from '../helpers/test-builders.ts';

/* ------------------------------------------------------------------ */
/*  Fixture Interface                                                 */
/* ------------------------------------------------------------------ */

export interface ProjectFixture {
  /** Project configuration */
  config: ProjectConfig;

  /** Epic configurations */
  epics: EpicConfig[];

  /** Task configurations */
  tasks: TaskConfig[];

  /** Initial gaps (before any execution) */
  initialGaps?: Gap[];

  /** Expected number of iterations to converge */
  expectedIterations?: number;

  /** Expected final gap count */
  expectedFinalGaps?: number;

  /** Whether this project should stall */
  shouldStall?: boolean;

  /** Unresolved gaps (for stalled projects) */
  unresolvedGaps?: Gap[];
}

/* ------------------------------------------------------------------ */
/*  Minimal Project Fixture                                           */
/* ------------------------------------------------------------------ */

/**
 * Minimal project that converges immediately
 * - Single epic with one install task
 * - No gaps to resolve
 * - Should complete in 1 iteration
 */
export const minimalProjectFixture: ProjectFixture = {
  config: createTestProjectConfig({
    name: 'Minimal Project',
    description: 'Simple project with minimal setup',
    goals: ['Dependencies installed'],
    epics: ['setup'],
  }),

  epics: [
    createTestEpicConfig({
      id: 'setup',
      name: 'Setup',
      description: 'Install dependencies',
      goals: [],
      tasks: ['install'],
    }),
  ],

  tasks: [
    createTestTask({
      id: 'install',
      title: 'Install Dependencies',
      type: 'install',
      fn: 'install',
    }),
  ],

  initialGaps: [],
  expectedIterations: 1,
  expectedFinalGaps: 0,
};

/* ------------------------------------------------------------------ */
/*  Gap-Driven Project Fixture                                        */
/* ------------------------------------------------------------------ */

/**
 * Gap-driven project with structural gaps
 * - Starts with missing files
 * - Tasks generated to fix gaps
 * - Should converge after resolving all gaps
 */
export const gapDrivenProjectFixture: ProjectFixture = {
  config: createTestProjectConfig({
    name: 'Gap-Driven Project',
    description: 'Project driven by gap detection and resolution',
    goals: ['All required files exist', 'Code quality meets standards'],
    epics: ['build'],
  }),

  epics: [
    createTestEpicConfig({
      id: 'build',
      name: 'Build Application',
      description: 'Create application structure and implement features',
      goals: [],
      tasks: [],
    }),
  ],

  tasks: [],

  initialGaps: [
    createStructuralGap('Missing package.json'),
    createStructuralGap('Missing src directory'),
    createStructuralGap('Missing README.md'),
  ],

  expectedIterations: 3,
  expectedFinalGaps: 0,
};

/* ------------------------------------------------------------------ */
/*  Quality-Focused Project Fixture                                   */
/* ------------------------------------------------------------------ */

/**
 * Project with quality gaps
 * - Code quality issues detected
 * - Tasks generated to fix quality problems
 * - Should converge after fixing all issues
 */
export const qualityProjectFixture: ProjectFixture = {
  config: createTestProjectConfig({
    name: 'Quality Project',
    description: 'Project focused on code quality',
    goals: ['All tests pass', 'No linting errors'],
    epics: ['quality'],
  }),

  epics: [
    createTestEpicConfig({
      id: 'quality',
      name: 'Code Quality',
      description: 'Ensure code meets quality standards',
      goals: [],
      tasks: ['lint', 'test'],
    }),
  ],

  tasks: [
    createTestTask({
      id: 'lint',
      title: 'Run Linter',
      type: 'lint',
      fn: 'lint',
    }),
    createTestTask({
      id: 'test',
      title: 'Run Tests',
      type: 'test',
      fn: 'test',
    }),
  ],

  initialGaps: [
    createQualityGap('ESLint violations found'),
    createQualityGap('Test failures detected'),
  ],

  expectedIterations: 2,
  expectedFinalGaps: 0,
};

/* ------------------------------------------------------------------ */
/*  Stalled Project Fixture                                           */
/* ------------------------------------------------------------------ */

/**
 * Project that stalls due to unresolvable gaps
 * - Has gaps that cannot be resolved
 * - Should detect stall after max iterations
 */
export const stalledProjectFixture: ProjectFixture = {
  config: createTestProjectConfig({
    name: 'Stalled Project',
    description: 'Project with unresolvable gaps',
    goals: ['Impossible goal'],
    epics: ['stalled'],
  }),

  epics: [
    createTestEpicConfig({
      id: 'stalled',
      name: 'Stalled Epic',
      description: 'Epic that cannot converge',
      goals: [],
      tasks: [],
    }),
  ],

  tasks: [],

  initialGaps: [],

  unresolvedGaps: [
    createStructuralGap('Permanent gap that cannot be resolved'),
  ],

  shouldStall: true,
  expectedIterations: 3, // Should stall after stallThreshold iterations
};

/* ------------------------------------------------------------------ */
/*  Multi-Epic Project Fixture                                        */
/* ------------------------------------------------------------------ */

/**
 * Project with multiple dependent epics
 * - Multiple epics with dependencies
 * - Tasks across epics
 * - Should execute in dependency order
 */
export const multiEpicProjectFixture: ProjectFixture = {
  config: createTestProjectConfig({
    name: 'Multi-Epic Project',
    description: 'Project with multiple epics and dependencies',
    goals: ['Setup complete', 'Features implemented', 'Tests passing'],
    epics: ['setup', 'implementation', 'testing'],
  }),

  epics: [
    createTestEpicConfig({
      id: 'setup',
      name: 'Setup',
      description: 'Initial project setup',
      goals: [],
      deps: [],
      tasks: ['install', 'configure'],
    }),
    createTestEpicConfig({
      id: 'implementation',
      name: 'Implementation',
      description: 'Implement features',
      goals: [],
      deps: ['setup'],
      tasks: ['code'],
    }),
    createTestEpicConfig({
      id: 'testing',
      name: 'Testing',
      description: 'Test implementation',
      goals: [],
      deps: ['implementation'],
      tasks: ['test'],
    }),
  ],

  tasks: [
    createTestTask({
      id: 'install',
      title: 'Install Dependencies',
      type: 'install',
      fn: 'install',
    }),
    createTestTask({
      id: 'configure',
      title: 'Configure Project',
      type: 'configure',
      fn: 'configure',
    }),
    createTestTask({
      id: 'code',
      title: 'Write Code',
      type: 'coding',
      fn: 'coding',
      deps: ['install', 'configure'],
    }),
    createTestTask({
      id: 'test',
      title: 'Run Tests',
      type: 'test',
      fn: 'test',
      deps: ['code'],
    }),
  ],

  initialGaps: [],
  expectedIterations: 4, // One per epic + final verification
  expectedFinalGaps: 0,
};

/* ------------------------------------------------------------------ */
/*  Parallel Tasks Project Fixture                                    */
/* ------------------------------------------------------------------ */

/**
 * Project with parallel task execution
 * - Multiple independent tasks
 * - Should execute tasks in parallel
 * - Should converge faster than sequential
 */
export const parallelTasksProjectFixture: ProjectFixture = {
  config: createTestProjectConfig({
    name: 'Parallel Project',
    description: 'Project with parallel task execution',
    goals: ['All modules built'],
    epics: ['parallel'],
  }),

  epics: [
    createTestEpicConfig({
      id: 'parallel',
      name: 'Parallel Execution',
      description: 'Execute tasks in parallel',
      goals: [],
      tasks: ['module-a', 'module-b', 'module-c'],
    }),
  ],

  tasks: [
    createTestTask({
      id: 'module-a',
      title: 'Build Module A',
      type: 'build',
      fn: 'build',
      vars: { module: 'a' },
    }),
    createTestTask({
      id: 'module-b',
      title: 'Build Module B',
      type: 'build',
      fn: 'build',
      vars: { module: 'b' },
    }),
    createTestTask({
      id: 'module-c',
      title: 'Build Module C',
      type: 'build',
      fn: 'build',
      vars: { module: 'c' },
    }),
  ],

  initialGaps: [],
  expectedIterations: 1,
  expectedFinalGaps: 0,
};

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                  */
/* ------------------------------------------------------------------ */

/**
 * Get all available fixtures
 */
export function getAllFixtures(): Record<string, ProjectFixture> {
  return {
    minimal: minimalProjectFixture,
    gapDriven: gapDrivenProjectFixture,
    quality: qualityProjectFixture,
    stalled: stalledProjectFixture,
    multiEpic: multiEpicProjectFixture,
    parallelTasks: parallelTasksProjectFixture,
  };
}

/**
 * Get fixture by name
 */
export function getFixture(name: string): ProjectFixture | undefined {
  return getAllFixtures()[name];
}
