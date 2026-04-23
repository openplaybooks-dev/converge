/**
 * Skill Context Resolver
 *
 * Resolves skill dependencies and loads skill content for agent context.
 * Supports three resolution strategies: auto, manual, and inherit.
 */

import { readFileSync } from "node:fs";
import type { SkillDependencyGraph } from "../task/discovery/skill-graph.ts";

export type SkillResolutionStrategy = "auto" | "manual" | "inherit";

export interface SkillResolutionConfig {
  /** Skills specified in task definition */
  taskSkills?: string[];

  /** Skills from agent definition */
  agentSkills?: string[];

  /** Resolution strategy */
  resolution: SkillResolutionStrategy;

  /** Skill dependency graph */
  skillGraph: SkillDependencyGraph;
}

export interface SkillResolutionResult {
  /** Ordered list of skills (dependency-first) */
  skills: string[];

  /** Skill name -> SKILL.md content */
  skillContent: Map<string, string>;
}

export class SkillContextResolver {
  /**
   * Resolve skills and load their content
   */
  async resolve(config: SkillResolutionConfig): Promise<SkillResolutionResult> {
    const {
      taskSkills = [],
      agentSkills = [],
      resolution,
      skillGraph,
    } = config;

    let resolvedSkills: string[];

    switch (resolution) {
      case "auto":
        // Merge task + agent skills, resolve all transitive deps
        resolvedSkills = skillGraph.getTaskSkills(taskSkills, agentSkills);
        break;

      case "manual":
        // Only explicit task skills, no transitive resolution
        resolvedSkills = taskSkills;
        break;

      case "inherit":
        // Only agent skills + transitive deps
        resolvedSkills = skillGraph.getAgentSkills(agentSkills);
        break;

      default:
        throw new Error(`Unknown skill resolution strategy: ${resolution}`);
    }

    // Load skill content
    const skillContent = new Map<string, string>();
    for (const skillName of resolvedSkills) {
      const node = skillGraph.getNode(skillName);
      if (node) {
        try {
          const content = readFileSync(node.path, "utf-8");
          skillContent.set(skillName, content);
        } catch (err: any) {
          console.warn(`Failed to load skill ${skillName}: ${err.message}`);
        }
      } else {
        console.warn(`Skill not found: ${skillName}`);
      }
    }

    return {
      skills: resolvedSkills,
      skillContent,
    };
  }
}
