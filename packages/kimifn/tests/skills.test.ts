import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { enhancePrompt, listSkills, listAgents } from "@openplaybooks/converge-agentfn";

// Project root is 2 levels up from kimifn package
const PROJECT_ROOT = join(process.cwd(), "..", "..");

describe("Skill/Agent loader (.converge folder)", () => {
  describe("enhancePrompt", () => {
    it("returns original prompt when no skills referenced", () => {
      const prompt = "Just a regular prompt without refs";
      const result = enhancePrompt(prompt);
      expect(result).toBe(prompt);
    });

    // The next three cases reference `web2next` / `websnap` skill fixtures
    // that no longer ship with the repo (skills/ now contains only
    // converge-* skills). Skipped until those fixtures are re-added or the
    // assertions are pointed at one of the current skills.
    it.skip("adds skill references for /skill commands", () => {
      const prompt = "Follow /web2next workflow";
      const result = enhancePrompt(prompt, { cwd: PROJECT_ROOT });
      expect(result).toContain("[^skill:web2next]");
      expect(result).toContain("**web2next**");
      expect(result).toContain("Next.js project");
      expect(result).toContain("REFERENCED SKILLS/AGENTS");
    });

    it.skip("treats @agent refs as agents (with fallback to skills)", () => {
      const prompt = "@websnap capture this site";
      const result = enhancePrompt(prompt, { cwd: PROJECT_ROOT });
      expect(result).toContain("[^skill:websnap]");
      expect(result).toContain("**websnap**");
      expect(result).toContain("Clone, capture, or snapshot");
    });

    it.skip("includes user prompt section", () => {
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
  });

  describe("listSkills", () => {
    it("returns array (may be empty if no .converge dir)", () => {
      const skills = listSkills(PROJECT_ROOT);
      expect(Array.isArray(skills)).toBe(true);
    });

    it.skip("finds web2next and websnap skills in project", () => {
      // Fixture skills removed from repo; see note above.
      const skills = listSkills(PROJECT_ROOT);
      expect(skills).toContain("web2next");
      expect(skills).toContain("websnap");
    });

    it("finds the converge-* skills shipped with the repo", () => {
      const skills = listSkills(PROJECT_ROOT);
      expect(skills).toEqual(expect.arrayContaining(["converge-control"]));
    });
  });

  describe("listAgents", () => {
    it("returns array (may be empty if no agent files)", () => {
      const agents = listAgents(PROJECT_ROOT);
      expect(Array.isArray(agents)).toBe(true);
    });
  });
});
