import type { PromptInput } from "./types.js";

/**
 * Extract JSON from markdown code fences like ```json ... ```
 * Falls back to the raw string if no fences are found.
 */
export function extractJson(raw: string): string {
  const fenceRe = /```(?:json)?\s*\n?([\s\S]*?)```/;
  const m = fenceRe.exec(raw);
  return m ? m[1].trim() : raw;
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
