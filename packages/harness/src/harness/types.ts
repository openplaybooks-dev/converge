/**
 * AutoHarness Types
 *
 * Types for the AutoHarness system that synthesizes executable validation code.
 */

import type { AutoHarnessConfig, HarnessIssue, HarnessResult } from '../functions/types.ts';

/* ------------------------------------------------------------------ */
/*  Harness Metadata                                                  */
/* ------------------------------------------------------------------ */

/**
 * Metadata about a synthesized harness
 */
export interface HarnessMetadata {
  /** Harness ID */
  id: string;

  /** When harness was synthesized */
  synthesizedAt: string;

  /** Source that generated the harness */
  source: 'task-prompt' | 'inputs' | 'outputs' | 'description' | 'custom';

  /** Harness configuration used */
  config: AutoHarnessConfig;

  /** Number of refinements performed */
  refinementCount: number;

  /** Cache key if cacheable */
  cacheKey?: string;
}

/**
 * Stored harness verdict
 */
export interface HarnessVerdict {
  /** When executed */
  executedAt: string;

  /** Result of execution */
  result: HarnessResult;

  /** Task ID this was executed for */
  taskId: string;

  /** Epic ID */
  epicId: string;
}

/**
 * Sandbox API available to harness code
 */
export interface HarnessSandboxAPI {
  /** File operations */
  file: {
    read(path: string): Promise<string>;
    exists(path: string): Promise<boolean>;
    glob(pattern: string): Promise<string[]>;
  };

  /** Shell operations (limited) */
  shell: {
    run(cmd: string): Promise<{
      stdout: string;
      stderr: string;
      exitCode: number;
    }>;
  };

  /** Issues array for reporting */
  issues: HarnessIssue[];
}

/**
 * Harness synthesis request
 */
export interface HarnessSynthesisRequest {
  /** Task context to derive validation from */
  taskContext: {
    id: string;
    title: string;
    description?: string;
    prompt?: string;
    inputs?: string[];
    outputs?: string[];
  };

  /** Harness configuration */
  config: AutoHarnessConfig;
}

/**
 * Synthesized harness code
 */
export interface SynthesizedHarness {
  /** Generated JavaScript code */
  code: string;

  /** Harness metadata */
  metadata: HarnessMetadata;

  /** Validation result from synthesis */
  validation: {
    isValid: boolean;
    errors?: string[];
  };
}

/* ------------------------------------------------------------------ */
/*  Refinement Types                                                  */
/* ------------------------------------------------------------------ */

/**
 * Refinement request
 */
export interface RefinementRequest {
  /** Current harness code */
  currentCode: string;

  /** Issues found during execution */
  issues: HarnessIssue[];

  /** Task result that failed validation */
  taskResult: {
    success: boolean;
    message?: string;
    filesModified?: string[];
  };

  /** Refinement iteration */
  iteration: number;

  /** Max refinements allowed */
  maxRefinements: number;
}

/**
 * Refinement result
 */
export interface RefinementResult {
  /** Refined harness code */
  code: string;

  /** Whether refinement was successful */
  success: boolean;

  /** Refinement rationale */
  rationale: string;

  /** Whether more refinement is needed */
  needsMoreRefinement: boolean;
}

export {
  AutoHarnessConfig,
  HarnessIssue,
  HarnessResult,
};
