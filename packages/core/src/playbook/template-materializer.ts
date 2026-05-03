/**
 * Template Materialization
 * 
 * Materializes playbook templates to journal with variable substitution.
 * Used when spawning tasks from Seed scripts.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface MaterializeOptions {
  templatePath: string;
  targetPath: string;
  vars: Record<string, any>;
}

/**
 * Materialize a template file with variable substitution.
 * Supports Mustache-style {{variable}} syntax.
 */
export async function materializeTemplate(
  opts: MaterializeOptions
): Promise<void> {
  let content = await readFile(opts.templatePath, 'utf-8');

  // Mustache-style variable substitution
  content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in opts.vars) {
      const value = opts.vars[key];
      // Convert to string, handle null/undefined
      return value != null ? String(value) : match;
    }
    // Keep placeholder if variable not provided
    return match;
  });

  // Ensure target directory exists
  await mkdir(dirname(opts.targetPath), { recursive: true });

  // Write materialized content
  await writeFile(opts.targetPath, content);
}

/**
 * Materialize multiple templates at once.
 */
export async function materializeTemplates(
  templates: MaterializeOptions[]
): Promise<void> {
  await Promise.all(templates.map(materializeTemplate));
}

/**
 * Extract variables from template content.
 * Returns list of {{variable}} placeholders found.
 */
export function extractTemplateVariables(content: string): string[] {
  const matches = content.matchAll(/\{\{(\w+)\}\}/g);
  const vars = new Set<string>();
  
  for (const match of matches) {
    vars.add(match[1]);
  }
  
  return Array.from(vars);
}

/**
 * Validate that all required variables are provided.
 * Returns list of missing variables.
 */
export async function validateTemplateVariables(
  templatePath: string,
  vars: Record<string, any>
): Promise<string[]> {
  const content = await readFile(templatePath, 'utf-8');
  const required = extractTemplateVariables(content);
  
  const missing: string[] = [];
  for (const varName of required) {
    if (!(varName in vars)) {
      missing.push(varName);
    }
  }
  
  return missing;
}
