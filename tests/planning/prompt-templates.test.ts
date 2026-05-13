import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const PLANNING_DIR = 'packages/core/src/planning/';

function getTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

function getPlanningFiles(): string[] {
  return getTsFiles(PLANNING_DIR);
}

function fileContains(filePath: string, pattern: RegExp): boolean {
  const content = readFileSync(filePath, 'utf-8');
  return pattern.test(content);
}

describe('Framework vs Project boundary — prompt templates', () => {
  const files = getPlanningFiles();

  it('No file under packages/core/src/planning/ contains the string "cinematic-video-production"', () => {
    const pattern = /cinematic-video-production/;
    const violations: string[] = [];

    for (const file of files) {
      if (fileContains(file, pattern)) {
        violations.push(file);
      }
    }

    // CORRECT behavior: framework prompts MUST NOT hardcode project-specific names.
    // The string 'cinematic-video-production' is an example project, not a framework concept.
    // Framework code should use generic placeholders resolved at runtime from project config.
    expect(violations).toEqual([]);
  });

  it('No file under packages/core/src/planning/ contains any hardcoded example project path', () => {
    const pattern = /examples\/[a-z][a-z0-9-]*\//i;
    const violations: string[] = [];

    for (const file of files) {
      if (fileContains(file, pattern)) {
        violations.push(file);
      }
    }

    // CORRECT behavior: framework prompts MUST NOT reference specific example projects.
    // Example paths like 'examples/foo/' leak project-specific knowledge into generic framework code.
    expect(violations).toEqual([]);
  });
});
