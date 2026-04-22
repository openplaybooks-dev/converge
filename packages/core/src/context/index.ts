/**
 * Context Module
 *
 * Exports all context types, implementations, and utilities.
 */

// Types
export type {
  BaseContext,
  ProjectContext,
  TaskContext,
  FileSystemAPI,
  ShellAPI,
  ShellExecOptions,
  ShellResult,
  GitAPI,
  LoggerAPI,
  EvalAPI,
  PlanAPI,
  CheckAPI,
  PluginAPI,
} from "./types.ts";

// Artifacts
export type { ArtifactAPI } from "../artifacts/index.ts";
export { ArtifactStore } from "../artifacts/index.ts";

// Base implementations
export {
  FileSystemAPIImpl,
  ShellAPIImpl,
  GitAPIImpl,
  LoggerAPIImpl,
} from "./base.ts";

// Context implementations
export { ProjectContextImpl, createProjectContext } from "./project-context.ts";

export { TaskContextImpl, createTaskContext } from "./task-context.ts";
