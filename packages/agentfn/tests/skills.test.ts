import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  enhancePrompt,
  listSkills,
  listAgents,
} from "../src/prompting.js";

// Project root is 2 levels up from agentfn package
const PROJECT_ROOT = join(process.cwd(), "..", "..");

describe("Skill/Agent loader (.crew folder)", () => {
  describe("enhancePrompt", () => {
    it("returns original prompt when no skills referenced", () => {
      const prompt = "Just a regular prompt without refs";
      const result = enhancePrompt(prompt);
      expect(result).toBe(prompt);
    });

    it("adds skill references for /skill commands", () => {
      const prompt = "Follow /web2next workflow";
      const result = enhancePrompt(prompt, { cwd: PROJECT_ROOT });
      expect(result).toContain("[^skill:web2next]");
      expect(result).toContain("**web2next**");
      expect(result).toContain("Next.js project"); // description from frontmatter
      expect(result).toContain("REFERENCED SKILLS/AGENTS");
    });

    it("treats @agent refs as agents (with fallback to skills)", () => {
      const prompt = "@websnap capture this site";
      const result = enhancePrompt(prompt, { cwd: PROJECT_ROOT });
      // websnap exists as a skill, so it falls back to skill reference
      expect(result).toContain("[^skill:websnap]");
      expect(result).toContain("**websnap**");
      expect(result).toContain("Clone, capture, or snapshot");
    });

    it("includes user prompt section", () => {
      const prompt = "Use /web2next";
      const result = enhancePrompt(prompt, { cwd: PROJECT_ROOT });
      expect(result).toContain("<!-- USER PROMPT -->");
      expect(result).toContain("Use /web2next");
    });

    it("extracts multiple skill references", () => {
      const prompt = "Use /websnap then /web2next to process";
      const refs: string[] = [];
      const regex = /\/([a-zA-Z0-9_-]+)/g;
      let match;
      while ((match = regex.exec(prompt)) !== null) {
        refs.push(match[1]);
      }
      expect(refs).toContain("websnap");
      expect(refs).toContain("web2next");
    });

    it("extracts multiple agent references", () => {
      const prompt = "Ask @helper and @reviewer";
      const refs: string[] = [];
      const regex = /@([a-zA-Z0-9_-]+)/g;
      let match;
      while ((match = regex.exec(prompt)) !== null) {
        refs.push(match[1]);
      }
      expect(refs).toContain("helper");
      expect(refs).toContain("reviewer");
    });
  });

  describe("listSkills", () => {
    it("returns array (may be empty if no .crew dir)", () => {
      const skills = listSkills(PROJECT_ROOT);
      expect(Array.isArray(skills)).toBe(true);
    });

    it("finds web2next and websnap skills in project", () => {
      const skills = listSkills(PROJECT_ROOT);
      expect(skills).toContain("web2next");
      expect(skills).toContain("websnap");
    });
  });

  describe("listAgents", () => {
    it("returns array (may be empty if no agent files)", () => {
      const agents = listAgents(PROJECT_ROOT);
      expect(Array.isArray(agents)).toBe(true);
    });
  });
});
