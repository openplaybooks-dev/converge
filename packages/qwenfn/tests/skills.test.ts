import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { enhancePrompt, listSkills } from "../src/skills.js";

// Project root is 2 levels up from qwenfn package
const PROJECT_ROOT = join(process.cwd(), "..", "..");

describe("Skill loader", () => {
  describe("enhancePrompt", () => {
    it("returns original prompt when no skills referenced", () => {
      const prompt = "Just a regular prompt without refs";
      const result = enhancePrompt(prompt);
      expect(result).toBe(prompt);
    });

    // The next three cases reference web2next/websnap fixture skills that
    // are no longer shipped with the repo. Skipped until the fixtures are
    // restored or the assertions move to a current skill name.
    it.skip("adds skill references for /skill commands", () => {
      const prompt = "Follow /web2next workflow";
      const result = enhancePrompt(prompt, PROJECT_ROOT);
      expect(result).toContain("[^skill:web2next]");
      expect(result).toContain("**web2next**");
      expect(result).toContain("Next.js project");
      expect(result).toContain("REFERENCED SKILLS");
    });

    it.skip("treats @agent refs as skills (Qwen has no subagents)", () => {
      const prompt = "@websnap capture this site";
      const result = enhancePrompt(prompt, PROJECT_ROOT);
      expect(result).toContain("[^skill:websnap]");
      expect(result).toContain("**websnap**");
      expect(result).toContain("Clone, capture, or snapshot");
    });

    it.skip("includes user prompt section", () => {
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

    it.skip("finds web2next and websnap skills in project", () => {
      const skills = listSkills(PROJECT_ROOT);
      expect(skills).toContain("web2next");
      expect(skills).toContain("websnap");
    });

    it("finds the converge-* skills shipped with the repo", () => {
      const skills = listSkills(PROJECT_ROOT);
      expect(skills).toEqual(expect.arrayContaining(["converge-control"]));
    });
  });
});
