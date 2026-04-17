/**
 * Prompt enhancement and injection module.
 *
 * Handles general prompt manipulation, including:
 * - Skill/agent reference enhancement
 * - Prompt templating and injection
 * - Context augmentation
 *
 * Note: The enhancePrompt function uses legacy auto-detection.
 * New code should use discoverSkills/loadSkill from skills.ts directly
 * and format prompts at the application level.
 */

import {
  listSkills,
  listAgents,
  legacyGetSkillPath,
  legacyGetAgentPath,
  getSkillMeta,
  getAgentMeta,
} from "./skills.js";

export interface EnhancePromptOptions {
  /** Working directory for finding .crew folder */
  cwd?: string;
}

/**
 * Extract @agent references from prompt
 * Matches: @agent-name, @agent_name, @AgentName
 */
function extractAgentRefs(prompt: string): string[] {
  const refs: string[] = [];
  const regex = /@([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = regex.exec(prompt)) !== null) {
    refs.push(match[1].toLowerCase());
  }
  return [...new Set(refs)];
}

/**
 * Extract /skill commands from prompt
 * Matches: /skill-name, /skill_name
 */
function extractSkillRefs(prompt: string): string[] {
  const refs: string[] = [];
  const regex = /\/([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = regex.exec(prompt)) !== null) {
    refs.push(match[1].toLowerCase());
  }
  return [...new Set(refs)];
}

/**
 * @deprecated Application-level prompt formatting should be done by the caller.
 * This function uses legacy auto-detection of .crew/ directories.
 *
 * Enhance a prompt by adding footnote references to skills and agents.
 *
 * - /skill refs point to .crew/{name}/SKILL.md
 * - @agent refs point to .crew/{name}/AGENT.md or .crew/{name}.md (fallback to SKILL.md)
 *
 * Returns the enhanced prompt with skill/agent footnotes.
 * The AI can load these files on-demand when needed.
 */
export function enhancePrompt(prompt: string, options?: EnhancePromptOptions): string {
  const cwd = options?.cwd;

  const skillRefs = extractSkillRefs(prompt);
  const agentRefs = extractAgentRefs(prompt);

  const footnotes: string[] = [];

  // Collect /skill references (capabilities)
  for (const ref of skillRefs) {
    const skillPath = legacyGetSkillPath(ref, cwd);
    if (skillPath) {
      const meta = getSkillMeta(skillPath);
      const desc = meta?.description || "No description";
      footnotes.push(
        `[^skill:${ref}]: **${meta?.name || ref}** — ${desc} [Load: ${skillPath}]`,
      );
    }
  }

  // Collect @agent references (try agent first, fallback to skill)
  for (const ref of agentRefs) {
    let agentPath = legacyGetAgentPath(ref, cwd);
    let meta: Record<string, string> | null = null;
    let footnoteType: "skill" | "agent" = "agent";

    if (agentPath) {
      meta = getAgentMeta(agentPath);
      footnoteType = "agent";
    }

    // Fallback to skill if no agent found
    if (!agentPath) {
      agentPath = legacyGetSkillPath(ref, cwd);
      if (agentPath) {
        meta = getSkillMeta(agentPath);
        footnoteType = "skill";
      }
    }

    if (agentPath && meta) {
      footnotes.push(
        `[^${footnoteType}:${ref}]: **${meta?.name || ref}** — ${meta?.description || "No description"} [Load: ${agentPath}]`,
      );
    }
  }

  if (footnotes.length === 0) {
    return prompt;
  }

  // Build enhanced prompt
  const parts: string[] = [];

  parts.push("<!-- REFERENCED SKILLS/AGENTS -->");
  parts.push(
    "The following skills/agents are referenced. Load the file if you need the full instructions:",
  );
  parts.push("");
  parts.push(...footnotes);
  parts.push("");
  parts.push("<!-- USER PROMPT -->");
  parts.push(prompt);

  return parts.join("\n");
}

// Re-export skill listing functions for convenience (legacy)
export { listSkills, listAgents };
