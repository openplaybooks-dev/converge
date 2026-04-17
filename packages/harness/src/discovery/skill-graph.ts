/**
 * Skill Dependency Graph
 *
 * Manages skill relationships and transitive dependency resolution.
 * Uses DFS-based algorithm to resolve dependencies and topological sort for load order.
 */

export interface SkillNode {
  name: string;
  path: string;
  dependencies: string[];
}

export class SkillDependencyGraph {
  private nodes: Map<string, SkillNode>;

  constructor(skills: Map<string, SkillNode>) {
    this.nodes = skills;
  }

  /**
   * Resolve transitive dependencies using depth-first search
   * @param skillNames Starting skill names
   * @returns Ordered list of all skills (dependencies first)
   */
  resolve(skillNames: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const visiting = new Set<string>(); // For cycle detection

    const dfs = (skillName: string, depth = 0): void => {
      // Prevent infinite loops with max depth
      if (depth > 10) {
        console.warn(`Max dependency depth reached for skill: ${skillName}`);
        return;
      }

      // Skip if already visited
      if (visited.has(skillName)) {
        return;
      }

      // Detect cycles
      if (visiting.has(skillName)) {
        console.warn(`Circular dependency detected: ${skillName}`);
        return;
      }

      const node = this.nodes.get(skillName);
      if (!node) {
        console.warn(`Skill not found: ${skillName}`);
        return;
      }

      // Mark as being visited (for cycle detection)
      visiting.add(skillName);

      // Visit dependencies first (must be loaded before dependent skill)
      for (const dependency of node.dependencies) {
        dfs(dependency, depth + 1);
      }

      // Mark as visited and add to result
      visiting.delete(skillName);
      visited.add(skillName);
      result.push(skillName);
    };

    // Process all starting skills
    for (const skillName of skillNames) {
      dfs(skillName);
    }

    return result;
  }

  /**
   * Get all skills for an agent (from agent.md + transitive)
   * @param agentSkills Skills defined in agent.md
   * @returns All resolved skills
   */
  getAgentSkills(agentSkills: string[]): string[] {
    return this.resolve(agentSkills);
  }

  /**
   * Merge task + agent skills with transitive resolution
   * @param taskSkills Skills specified in task definition
   * @param agentSkills Skills from agent definition
   * @returns Merged and resolved skills
   */
  getTaskSkills(taskSkills: string[], agentSkills: string[]): string[] {
    // Merge task and agent skills (task skills take precedence)
    const mergedSkills = [...new Set([...taskSkills, ...agentSkills])];
    return this.resolve(mergedSkills);
  }

  /**
   * Get skill node by name
   */
  getNode(skillName: string): SkillNode | undefined {
    return this.nodes.get(skillName);
  }

  /**
   * Get all skill names
   */
  getAllSkills(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Check if a skill exists
   */
  hasSkill(skillName: string): boolean {
    return this.nodes.has(skillName);
  }
}
