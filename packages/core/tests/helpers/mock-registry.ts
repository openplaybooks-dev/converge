/**
 * Mock Registry - Reusable Mock Functions
 *
 * Centralized collection of mock functions for testing Converge V2 framework.
 * All mocks are stateless and predictable unless explicitly configured as stateful.
 */

import type { CheckResult, Gap, EvalResult } from "../../src/gap/types.ts";
import type { TaskResult } from "../../src/functions/types.ts";
import type { TaskConfig } from "../../src/storage/types.ts";
import { createTestGap } from "./test-builders.ts";

/* ------------------------------------------------------------------ */
/*  Mock Check Functions                                              */
/* ------------------------------------------------------------------ */

export const mockChecks = {
  /**
   * Always passes - no gaps detected
   */
  typescript: (): CheckResult => ({
    check: "typescript",
    passed: true,
    gaps: [],
    message: "TypeScript compilation successful",
  }),

  /**
   * Configurable ESLint check
   */
  eslint: (shouldFail = false): CheckResult => ({
    check: "eslint",
    passed: !shouldFail,
    gaps: shouldFail
      ? [
          createTestGap({
            type: "quality",
            description: "ESLint violations detected",
          }),
        ]
      : [],
    message: shouldFail ? "ESLint found errors" : "ESLint passed",
  }),

  /**
   * Always passes
   */
  jest: (): CheckResult => ({
    check: "jest",
    passed: true,
    gaps: [],
    message: "All tests passed",
  }),

  /**
   * Configurable test check
   */
  testsPass: (shouldFail = false): CheckResult => ({
    check: "tests-pass",
    passed: !shouldFail,
    gaps: shouldFail
      ? [
          createTestGap({
            type: "quality",
            description: "Test failures detected",
          }),
        ]
      : [],
    message: shouldFail ? "Tests failed" : "Tests passed",
  }),

  /**
   * File existence check
   */
  filesExist: (missingFiles: string[] = []): CheckResult => ({
    check: "files-exist",
    passed: missingFiles.length === 0,
    gaps: missingFiles.map((file) =>
      createTestGap({
        type: "structural",
        description: `Missing file: ${file}`,
        metadata: { file },
      }),
    ),
    message:
      missingFiles.length === 0
        ? "All required files exist"
        : `Missing files: ${missingFiles.join(", ")}`,
  }),

  /**
   * Custom check with configurable gaps
   */
  custom: (passed: boolean, gaps: Gap[] = []): CheckResult => ({
    check: "custom",
    passed,
    gaps,
    message: passed ? "Check passed" : "Check failed",
  }),

  /**
   * Slow check (for timeout testing)
   */
  slow: async (delayMs = 100): Promise<CheckResult> => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return {
      check: "slow",
      passed: true,
      gaps: [],
      message: `Completed after ${delayMs}ms`,
    };
  },
};

/* ------------------------------------------------------------------ */
/*  Mock Eval Functions                                               */
/* ------------------------------------------------------------------ */

export const mockEvals = {
  /**
   * Project structure evaluation
   */
  projectStructure: (hasGaps = false): EvalResult => {
    const gaps = hasGaps
      ? [
          createTestGap({
            type: "structural",
            level: "project",
            description: "Missing package.json",
          }),
        ]
      : [];

    return {
      gaps,
      summary: {
        total: gaps.length,
        byType: {
          structural: gaps.filter((g) => g.type === "structural").length,
          semantic: 0,
          quality: 0,
          integration: 0,
        },
        byLevel: {
          project: gaps.filter((g) => g.level === "project").length,
          epic: 0,
          task: 0,
        },
      },
      timestamp: new Date().toISOString(),
      checksRun: ["files-exist"],
    };
  },

  /**
   * Epic completeness evaluation
   */
  epicCompleteness: (hasGaps = false): EvalResult => {
    const gaps = hasGaps
      ? [
          createTestGap({
            type: "semantic",
            level: "epic",
            description: "Epic goals not satisfied",
          }),
        ]
      : [];

    return {
      gaps,
      summary: {
        total: gaps.length,
        byType: {
          structural: 0,
          semantic: gaps.filter((g) => g.type === "semantic").length,
          quality: 0,
          integration: 0,
        },
        byLevel: {
          project: 0,
          epic: gaps.filter((g) => g.level === "epic").length,
          task: 0,
        },
      },
      timestamp: new Date().toISOString(),
      checksRun: ["goal-check"],
    };
  },

  /**
   * Custom eval with configurable gaps
   */
  custom: (gaps: Gap[]): EvalResult => {
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
      checksRun: ["custom"],
    };
  },
};

/* ------------------------------------------------------------------ */
/*  Mock Plan Functions                                               */
/* ------------------------------------------------------------------ */

export const mockPlanners = {
  /**
   * Structural gap planner - creates one task per gap
   */
  structural: (gaps: Gap[]): TaskConfig[] => {
    return gaps
      .filter((gap) => gap.type === "structural")
      .map((gap) => ({
        id: `fix-${gap.id}`,
        title: `Fix: ${gap.description}`,
        description: `Address structural gap: ${gap.description}`,
        type: "fix-structural",
        deps: [],
        inputs: [],
        outputs: [],
        checks: [],
        fn: "fix-structural",
        vars: { gapId: gap.id },
        constraints: {},
        metadata: { generatedFrom: gap.id },
      }));
  },

  /**
   * Quality gap planner
   */
  quality: (gaps: Gap[]): TaskConfig[] => {
    return gaps
      .filter((gap) => gap.type === "quality")
      .map((gap) => ({
        id: `fix-${gap.id}`,
        title: `Fix: ${gap.description}`,
        description: `Address quality gap: ${gap.description}`,
        type: "fix-quality",
        deps: [],
        inputs: [],
        outputs: [],
        checks: [],
        fn: "fix-quality",
        vars: { gapId: gap.id },
        constraints: {},
        metadata: { generatedFrom: gap.id },
      }));
  },

  /**
   * Empty planner - generates no tasks
   */
  empty: (): TaskConfig[] => [],

  /**
   * Custom planner
   */
  custom: (tasks: TaskConfig[]): (() => TaskConfig[]) => {
    return () => tasks;
  },
};

/* ------------------------------------------------------------------ */
/*  Mock Task Functions                                               */
/* ------------------------------------------------------------------ */

export const mockTasks = {
  /**
   * Install task - always succeeds
   */
  install: (): TaskResult => ({
    success: true,
    message: "Dependencies installed successfully",
    filesModified: ["package-lock.json"],
  }),

  /**
   * Generate screen subtasks - simulates 003-generate-all-screens.ts
   * Creates subtask configs for each screen in the sitemap
   */
  generateScreenSubtasks: (screens: string[]): TaskResult => {
    const subtasksGenerated = screens.map((screen, index) => {
      const prefix = String(index + 1).padStart(3, "0");
      return `${prefix}-screen-${screen}.ts`;
    });

    return {
      success: true,
      message: `Generated ${screens.length} screen subtasks`,
      filesModified: subtasksGenerated,
      output: {
        subtasks: subtasksGenerated,
        count: screens.length,
      },
    };
  },

  /**
   * Generate single screen - simulates individual screen generation task
   */
  generateScreen: (screenName: string, shouldFail = false): TaskResult => ({
    success: !shouldFail,
    message: shouldFail
      ? `Failed to generate ${screenName} screen`
      : `Generated ${screenName} screen successfully`,
    filesModified: shouldFail
      ? []
      : [`.stitch/designs/${screenName}.html`, ".stitch/metadata.json"],
    output: shouldFail
      ? undefined
      : {
          screen: screenName,
          file: `.stitch/designs/${screenName}.html`,
        },
  }),

  /**
   * Coding task - configurable success/failure
   */
  coding: (shouldFail = false): TaskResult => ({
    success: !shouldFail,
    message: shouldFail ? undefined : "Code generated successfully",
    error: shouldFail
      ? {
          message: "Failed to generate code",
          recoverable: true,
        }
      : undefined,
    filesModified: shouldFail ? [] : ["src/index.ts"],
  }),

  /**
   * Test task - configurable success/failure
   */
  test: (shouldFail = false): TaskResult => ({
    success: !shouldFail,
    message: shouldFail ? undefined : "All tests passed",
    error: shouldFail
      ? {
          message: "3 tests failed",
          recoverable: true,
        }
      : undefined,
  }),

  /**
   * Build task - always succeeds
   */
  build: (): TaskResult => ({
    success: true,
    message: "Build completed successfully",
    filesModified: ["dist/index.js"],
  }),

  /**
   * Deploy task - always succeeds
   */
  deploy: (): TaskResult => ({
    success: true,
    message: "Deployed to production",
  }),

  /**
   * Stateful retry task - fails N times then succeeds
   */
  createRetryTask: (failCount: number): (() => TaskResult) => {
    let attempts = 0;
    return () => {
      attempts++;
      const shouldFail = attempts <= failCount;
      return {
        success: !shouldFail,
        message: shouldFail ? undefined : `Succeeded on attempt ${attempts}`,
        error: shouldFail
          ? {
              message: `Attempt ${attempts} failed`,
              recoverable: true,
            }
          : undefined,
        metadata: { attempts },
      };
    };
  },

  /**
   * Slow task (for timeout testing)
   */
  createSlowTask: (delayMs: number): (() => Promise<TaskResult>) => {
    return async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return {
        success: true,
        message: `Completed after ${delayMs}ms`,
      };
    };
  },

  /**
   * Task that discovers new gaps
   */
  discoverGaps: (discoveredGaps: Gap[]): TaskResult => ({
    success: true,
    message: "Task completed, but discovered new gaps",
    gapsDiscovered: discoveredGaps,
  }),

  /**
   * Task that resolves specific gaps
   */
  resolveGaps: (gapIds: string[]): TaskResult => ({
    success: true,
    message: `Resolved ${gapIds.length} gap(s)`,
    gapsResolved: gapIds,
  }),

  /**
   * Custom task
   */
  custom: (result: TaskResult): (() => TaskResult) => {
    return () => result;
  },
};

/* ------------------------------------------------------------------ */
/*  Mock Call Recording                                               */
/* ------------------------------------------------------------------ */

/**
 * Call recorder for testing function invocations
 */
export class MockCallRecorder<T extends (...args: any[]) => any> {
  private calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> = [];

  constructor(private fn: T) {}

  /**
   * Execute function and record call
   */
  execute(...args: Parameters<T>): ReturnType<T> {
    const result = this.fn(...args);
    this.calls.push({ args, result });
    return result;
  }

  /**
   * Get all recorded calls
   */
  getCalls() {
    return this.calls;
  }

  /**
   * Get call count
   */
  getCallCount(): number {
    return this.calls.length;
  }

  /**
   * Get last call
   */
  getLastCall() {
    return this.calls[this.calls.length - 1];
  }

  /**
   * Clear recorded calls
   */
  clear() {
    this.calls = [];
  }

  /**
   * Check if function was called with specific args
   */
  wasCalledWith(...args: Parameters<T>): boolean {
    return this.calls.some(
      (call) => JSON.stringify(call.args) === JSON.stringify(args),
    );
  }
}

/**
 * Create a recorded mock function
 */
export function createRecordedMock<T extends (...args: any[]) => any>(
  fn: T,
): MockCallRecorder<T> {
  return new MockCallRecorder(fn);
}

/* ------------------------------------------------------------------ */
/*  Export Default Registry                                           */
/* ------------------------------------------------------------------ */

/**
 * Default mock registry with all mock functions
 */
export const mockRegistry = {
  checks: mockChecks,
  evals: mockEvals,
  planners: mockPlanners,
  tasks: mockTasks,
  createRecordedMock,
};
