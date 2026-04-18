/**
 * Executor Module V2
 *
 * Exports function-driven execution capabilities.
 */

export {
  FunctionExecutor,
  BatchExecutor,
  createFunctionExecutor,
  createBatchExecutor,
  DEFAULT_EXECUTION_OPTIONS,
} from "./function-executor.ts";

export type { ExecutionOptions, ExecutionResult } from "./function-executor.ts";
