import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  enhancePrompt,
  listSkills,
} from "../src/skills.js";

// Project root is 2 levels up from qwenfn package
const PROJECT_ROOT = join(process.cwd(), "..", "..");

describe("Skill loader", () => {
  describe("enhancePrompt", () => {
    it("returns original prompt when no skills referenced", () => {
      const prompt = "Just a regular prompt without refs";
      const result = enhancePrompt(prompt);
      expect(result).toBe(prompt);
    });

    it("adds skill references for /skill commands", () => {
      const prompt = "Follow /web2next workflow";
      const result = enhancePrompt(prompt, PROJECT_ROOT);
      expect(result).toContain("[^skill:web2next]");
      expect(result).toContain("**web2next**");
      expect(result).toContain("Next.js project"); // description from frontmatter
      expect(result).toContain("REFERENCED SKILLS");
    });

    it("treats @agent refs as skills (Qwen has no subagents)", () => {
      const prompt = "@websnap capture this site";
      const result = enhancePrompt(prompt, PROJECT_ROOT);
      // Should be treated as skill reference, not agent
      expect(result).toContain("[^skill:websnap]");
      expect(result).toContain("**websnap**");
      expect(result).toContain("Clone, capture, or snapshot");
    });

    it("includes user prompt section", () => {
      const prompt = "Use /web2next";
      const result = enhancePrompt(prompt, PROJECT_ROOT);
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
  });

  describe("listSkills", () => {
    it("returns array (may be empty if no skills dir)", () => {
      const skills = listSkills(PROJECT_ROOT);
      expect(Array.isArray(skills)).toBe(true);
    });

    it("finds web2next and websnap skills in project", () => {
      const skills = listSkills(PROJECT_ROOT);
      expect(skills).toContain("web2next");
      expect(skills).toContain("websnap");
    });
  });
});
