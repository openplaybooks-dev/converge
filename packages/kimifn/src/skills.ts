/**
 * Adaptive skill reference loader for Kimi.
 * 
 * Auto-detects /skill commands in prompts,
 * then adds footnotes pointing to the skill file paths.
 * The AI can load these files on-demand when needed.
 * 
 * Note: Kimi does not support subagents, so only skills are supported
 * (no @agent persona references).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** 
 * Find the project root by looking for pnpm-workspace.yaml or package.json
 * Starting from cwd and walking up
 */
function findProjectRoot(startDir: string = process.cwd()): string | null {
  let dir = resolve(startDir);
  while (dir !== "/") {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** 
 * Get the skills directory path.
 * Checks KIMI_SKILLS_PATH env var, then looks in project root/skills
 */
function getSkillsDir(cwd?: string): string | null {
  // Allow override via env
  if (process.env.KIMI_SKILLS_PATH) {
    return process.env.KIMI_SKILLS_PATH;
  }
  
  const root = findProjectRoot(cwd);
  if (!root) return null;
  
  const skillsDir = join(root, "skills");
  return existsSync(skillsDir) ? skillsDir : null;
}

/** 
 * Get the agents directory path.
 * Checks KIMI_AGENTS_PATH env var, then looks in project root/agents
 */
function getAgentsDir(cwd?: string): string | null {
  if (process.env.KIMI_AGENTS_PATH) {
    return process.env.KIMI_AGENTS_PATH;
  }
  
  const root = findProjectRoot(cwd);
  if (!root) return null;
  
  const agentsDir = join(root, "agents");
  return existsSync(agentsDir) ? agentsDir : null;
}

/** List available skills */
export function listSkills(cwd?: string): string[] {
  const skillsDir = getSkillsDir(cwd);
  if (!skillsDir) return [];
  
  try {
    return readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

/** List available agents */
export function listAgents(cwd?: string): string[] {
  const agentsDir = getAgentsDir(cwd);
  if (!agentsDir) return [];
  
  try {
    const entries = readdirSync(agentsDir, { withFileTypes: true });
    const dirs = entries.filter((d) => d.isDirectory()).map((d) => d.name);
    const files = entries
      .filter((d) => d.isFile() && d.name.endsWith(".md"))
      .map((d) => d.name.replace(".md", ""));
    return [...new Set([...dirs, ...files])];
  } catch {
    return [];
  }
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

/** Get the path to a skill file */
function getSkillPath(name: string, cwd?: string): string | null {
  const skillsDir = getSkillsDir(cwd);
  if (!skillsDir) return null;
  const skillPath = join(skillsDir, name, "SKILL.md");
  return existsSync(skillPath) ? skillPath : null;
}

/** Get the path to an agent file */
function getAgentPath(name: string, cwd?: string): string | null {
  const agentsDir = getAgentsDir(cwd);
  if (!agentsDir) return null;
  
  const agentPath1 = join(agentsDir, `${name}.md`);
  const agentPath2 = join(agentsDir, name, "AGENT.md");
  
  if (existsSync(agentPath1)) return agentPath1;
  if (existsSync(agentPath2)) return agentPath2;
  return null;
}

/** Parse YAML frontmatter from markdown content */
function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return result;
  
  const yaml = match[1];
  for (const line of yaml.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      result[key] = value;
    }
  }
  return result;
}

/** Get skill metadata (name, description, etc.) from file */
function getSkillMeta(path: string): Record<string, string> | null {
  try {
    const content = readFileSync(path, "utf-8");
    return parseFrontmatter(content);
  } catch {
    return null;
  }
}

/** 
 * Enhance a prompt by adding footnote references to skills.
 * 
 * Kimi does not support subagents, so @agent references are treated
 * the same as /skill commands - both point to skill files.
 * 
 * Returns the enhanced prompt with skill footnotes.
 * The AI can load these files on-demand when needed.
 */
export function enhancePrompt(prompt: string, cwd?: string): string {
  const skillRefs = extractSkillRefs(prompt);
  const agentRefs = extractAgentRefs(prompt);
  
  const footnotes: string[] = [];
  
  // Collect /skill references (capabilities)
  for (const ref of skillRefs) {
    const skillPath = getSkillPath(ref, cwd);
    if (skillPath) {
      const meta = getSkillMeta(skillPath);
      const desc = meta?.description || 'No description';
      footnotes.push(`[^skill:${ref}]: **${meta?.name || ref}** — ${desc} [Load: ${skillPath}]`);
    }
  }
  
  // Collect @agent references (also treated as skills since Kimi has no subagents)
  for (const ref of agentRefs) {
    // Try agents dir first, fallback to skills
    let skillPath = getAgentPath(ref, cwd);
    if (!skillPath) {
      skillPath = getSkillPath(ref, cwd);
    }
    
    if (skillPath) {
      const meta = getSkillMeta(skillPath);
      const desc = meta?.description || 'No description';
      footnotes.push(`[^skill:${ref}]: **${meta?.name || ref}** — ${desc} [Load: ${skillPath}]`);
    }
  }
  
  if (footnotes.length === 0) {
    return prompt;
  }
  
  // Build enhanced prompt
  const parts: string[] = [];
  
  parts.push("<!-- REFERENCED SKILLS -->");
  parts.push("The following skills are referenced. Load the file if you need the full instructions:");
  parts.push("");
  parts.push(...footnotes);
  parts.push("");
  parts.push("<!-- USER PROMPT -->");
  parts.push(prompt);
  
  return parts.join("\n");
}
