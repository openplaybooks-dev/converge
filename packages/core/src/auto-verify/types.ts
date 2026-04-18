/**
 * AutoConverge Types
 *
 * Types for the AutoConverge system that synthesizes executable validation code.
 */

import type {
  AutoConvergeConfig,
  ConvergeIssue,
  ConvergeResult,
} from "../functions/types.ts";

/* ------------------------------------------------------------------ */
/*  Converge Metadata                                                  */
/* ------------------------------------------------------------------ */

/**
 * Metadata about a synthesized verification
 */
export interface ConvergeMetadata {
  /** Verification ID */
  id: string;

  /** When verification was synthesized */
  synthesizedAt: string;

  /** Source that generated the converge */
  source: "task-prompt" | "inputs" | "outputs" | "description" | "custom";

  /** Converge configuration used */
  config: AutoConvergeConfig;

  /** Number of refinements performed */
  refinementCount: number;

  /** Cache key if cacheable */
  cacheKey?: string;
}

/**
 * Stored verification verdict
 */
export interface ConvergeVerdict {
  /** When executed */
  executedAt: string;

  /** Result of execution */
  result: ConvergeResult;

  /** Task ID this was executed for */
  taskId: string;

  /** Epic ID */
  epicId: string;
}

/**
 * Sandbox API available to verification code
 */
export interface ConvergeSandboxAPI {
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
  issues: ConvergeIssue[];
}

/**
 * Verification synthesis request
 */
export interface ConvergeSynthesisRequest {
  /** Task context to derive validation from */
  taskContext: {
    id: string;
    title: string;
    description?: string;
    prompt?: string;
    inputs?: string[];
    outputs?: string[];
  };

  /** Converge configuration */
  config: AutoConvergeConfig;
}

/**
 * Synthesized verification code
 */
export interface SynthesizedVerification {
  /** Generated JavaScript code */
  code: string;

  /** Converge metadata */
  metadata: ConvergeMetadata;

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
  /** Current verification code */
  currentCode: string;

  /** Issues found during execution */
  issues: ConvergeIssue[];

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
  /** Refined verification code */
  code: string;

  /** Whether refinement was successful */
  success: boolean;

  /** Refinement rationale */
  rationale: string;

  /** Whether more refinement is needed */
  needsMoreRefinement: boolean;
}

export { AutoConvergeConfig, ConvergeIssue, ConvergeResult };
