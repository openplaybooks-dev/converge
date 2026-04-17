/**
 * Client SDK Types
 *
 * Types for the harness client SDK, used by external WBS scripts
 * to interact with the harness framework.
 */

/**
 * Context provided to the client from the harness environment.
 * Populated from HARNESS_CONTEXT_JSON env var or individual HARNESS_VAR_* vars.
 */
export interface HarnessClientContext {
  /** Absolute project root directory */
  projectDir: string;
  /** Current epic ID (if available) */
  epicId?: string;
  /** Current task ID (if available) */
  taskId?: string;
  /** Variables from the parent task */
  vars: Record<string, unknown>;
}

/**
 * Task definition shape for spawning from WBS scripts.
 * This is the JSON-serializable subset of TaskDefinition.
 */
export interface SpawnedTask {
  /** Unique task ID (required) */
  id: string;
  /** Human-readable title */
  title?: string;
  /** Description */
  description?: string;
  /** Skills to use */
  skills?: string[];
  /** Agent name */
  agent?: string;
  /** AI prompt (markdown body) */
  body?: string;
  /** Alternative to body — same effect */
  prompt?: string;
  /** Input file paths/globs */
  inputs?: string[];
  /** Expected output file paths/globs */
  outputs?: string[];
  /** Verification checks */
  checks?: Array<{ id: string; cmd: string; description?: string }>;
  /** Task dependencies */
  dependencies?: string[];
  /** Task tags */
  tags?: string[];
  /** Whether task is blocking */
  blocking?: boolean;
  /** Task variables */
  vars?: Record<string, unknown>;
}
