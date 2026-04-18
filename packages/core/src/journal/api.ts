/**
 * Journal API Implementation
 *
 * Provides journal access methods for task/epic/project contexts.
 */

import type {
  JournalAPI,
  SearchLogOptions,
  ReadLogOptions,
  JournalEvent,
  GapSummary,
} from "./types.ts";
import type { Gap } from "../gap/types.ts";
import {
  readGaps,
  readGapSummary,
  readEvents,
  searchEvents,
} from "./reader.ts";

/* ------------------------------------------------------------------ */
/*  Journal API Factory                                               */
/* ------------------------------------------------------------------ */

/**
 * Create journal API for a specific context level
 */
export function createJournalAPI(
  projectDir: string,
  level: "project" | "epic" | "task",
  scope: string,
): JournalAPI {
  return {
    async getGaps(): Promise<Gap[]> {
      return readGaps(projectDir, level, scope);
    },

    async getSummary(): Promise<GapSummary> {
      const summary = await readGapSummary(projectDir, level, scope);
      return (
        summary || {
          total: 0,
          byType: {},
          bySeverity: {},
          updated: new Date().toISOString(),
          gaps: [],
        }
      );
    },

    async getRecentEvents(count: number = 20): Promise<JournalEvent[]> {
      return readEvents(projectDir, level, scope, { last: count });
    },

    async findErrors(): Promise<JournalEvent[]> {
      return searchEvents(projectDir, level, scope, {
        eventType: ["ERROR", "TASK_FAILED", "EPIC_FAILED", "CHECK_FAILED"],
      });
    },

    async searchLog(options: SearchLogOptions): Promise<JournalEvent[]> {
      return searchEvents(projectDir, level, scope, options);
    },

    async readLog(options?: ReadLogOptions): Promise<JournalEvent[]> {
      return readEvents(projectDir, level, scope, options);
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Convenience Helpers                                               */
/* ------------------------------------------------------------------ */

/**
 * Create task-level journal API
 */
export function createTaskJournalAPI(
  projectDir: string,
  epicId: string,
  taskId: string,
): JournalAPI {
  return createJournalAPI(projectDir, "task", `${epicId}.${taskId}`);
}

/**
 * Create epic-level journal API
 */
export function createEpicJournalAPI(
  projectDir: string,
  epicId: string,
): JournalAPI {
  return createJournalAPI(projectDir, "epic", epicId);
}

/**
 * Create project-level journal API
 */
export function createProjectJournalAPI(projectDir: string): JournalAPI {
  return createJournalAPI(projectDir, "project", "project");
}
