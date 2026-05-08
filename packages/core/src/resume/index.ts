/**
 * Resume Module (deprecated)
 *
 * Superseded by fingerprint-based caching in RunStateManager.
 * The single-target model eliminates cross-machine resume.
 */

/** @deprecated Use RunStateManager fingerprint caching instead. */
export type ResumePoint = {
  epicId?: string;
  taskId?: string;
  playbackDepth: number;
  actionCount: number;
};
