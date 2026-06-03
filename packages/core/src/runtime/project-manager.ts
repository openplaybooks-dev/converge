/**
 * Project Manager Implementation
 */

import type { ProjectManager } from "./types.ts";
import type { ProjectConfig } from "../storage/types.ts";
import type { EpicDefinition } from "../task/checks/types.ts";

export class ProjectManagerImpl implements ProjectManager {
  private config: ProjectConfig;
  private epics: EpicDefinition[];

  constructor(config: ProjectConfig, epics: EpicDefinition[]) {
    this.config = config;
    this.epics = epics;
  }

  /**
   * Get project status
   */
  status(): {
    converged: boolean;
  } {
    return {
      converged: false,
    };
  }

  /**
   * Get project name
   */
  getName(): string {
    return this.config.name;
  }
}
