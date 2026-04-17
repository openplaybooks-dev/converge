import type { PromptInput } from "./types.js";

/**
 * Extract JSON from markdown code fences like ```json ... ```
 * Falls back to the raw string if no fences are found.
 *
 * Uses a greedy strategy: finds the LAST closing ``` to handle
 * cases where the JSON value itself contains markdown code blocks.
 */
export function extractJson(raw: string): string {
  // Strategy 1: Find ```json opening, then match to the LAST ``` in the string.
  // This handles nested code fences inside JSON string values.
  const openRe = /```(?:json)?\s*\n?/;
  const openMatch = openRe.exec(raw);
  if (openMatch) {
    const contentStart = openMatch.index + openMatch[0].length;
    const lastFence = raw.lastIndexOf('```');
    if (lastFence > contentStart) {
      return raw.slice(contentStart, lastFence).trim();
    }
    // Opening fence but no closing — return everything after opening
    return raw.slice(contentStart).trim();
  }

  // Strategy 2: Find outermost { ... } by bracket matching
  const firstBrace = raw.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = firstBrace; i < raw.length; i++) {
      const ch = raw[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') { depth--; if (depth === 0) return raw.slice(firstBrace, i + 1); }
    }
    // Unclosed — return from first brace to end (let JSON.parse report the real error)
    return raw.slice(firstBrace);
  }

  return raw;
}

/** Resolve prompt template to a string */
export function resolvePrompt(
  template: PromptInput,
  input: string | undefined,
): string {
  if (typeof template === "function") {
    return template(input);
  }
  return input ? template.replace(/\{\{input\}\}/g, input) : template;
}
