/**
 * Filesystem-Native Storage Module
 *
 * Exports all storage-related functionality:
 * - Type definitions and schemas
 * - Filesystem storage implementation
 * - Status management
 * - Provenance tracking
 */

// Core types and schemas
export type {
  ProjectConfig,
  TaskConfig,
  TaskStatus,
  GapType,
  Gap,
  GapSnapshot,
  Checkpoint,
  ProvenanceRecord,
  StoragePaths,
} from "./types.ts";

export {
  ProjectConfigSchema,
  TaskConfigSchema,
  TaskStatusSchema,
  GapTypeSchema,
  GapSchema,
  GapSnapshotSchema,
  CheckpointSchema,
  ProvenanceRecordSchema,
  createStoragePaths,
} from "./types.ts";

// Filesystem storage
export { FilesystemStorage, createFilesystemStorage } from "./filesystem.ts";

// Status management
export { StatusManager, createStatusManager } from "./status.ts";

// Provenance tracking
export { ProvenanceManager, createProvenanceManager } from "./provenance.ts";
