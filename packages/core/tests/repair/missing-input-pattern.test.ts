/**
 * Tests for MissingInputPatternRepairStrategy
 *
 * Validates pattern mismatch detection and correction suggestions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MissingInputPatternRepairStrategy } from '../../src/repair/strategies/missing-input-pattern.ts';
import type { Gap } from '../../src/gap/types.ts';
import type { StrategyContext } from '../../src/repair/types.ts';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('MissingInputPatternRepairStrategy', () => {
  let strategy: MissingInputPatternRepairStrategy;
  let testDir: string;
  let ctx: StrategyContext;

  beforeEach(() => {
    strategy = new MissingInputPatternRepairStrategy();

    // Create temp directory for testing
    testDir = mkdtempSync(join(tmpdir(), 'pattern-test-'));

    ctx = {
      projectDir: testDir,
      journalCtx: { epicId: '03-implement-app', taskId: '001-test' },
      timeline: {} as any,
      attempt: 1,
    };
  });

  afterEach(() => {
    // Clean up temp directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('canHandle', () => {
    it('should handle blocker gaps with glob patterns', () => {
      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'blocker',
          missingInputs: ['.stitch/designs/*.html'],
        },
      };

      expect(strategy.canHandle(gap)).toBe(true);
    });

    it('should handle input gaps with glob patterns', () => {
      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'input',
          missingInputs: ['src/components/*.tsx'],
        },
      };

      expect(strategy.canHandle(gap)).toBe(true);
    });

    it('should not handle gaps without glob patterns', () => {
      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'blocker',
          missingInputs: ['src/exact-file.ts'],
        },
      };

      expect(strategy.canHandle(gap)).toBe(false);
    });

    it('should not handle non-blocker/input gaps', () => {
      const gap: Gap = {
        id: 'gap-1',
        type: 'check-failure',
        description: 'Check failed',
        metadata: {
          gapKind: 'check-failure',
          missingInputs: ['.stitch/designs/*.html'],
        },
      };

      expect(strategy.canHandle(gap)).toBe(false);
    });
  });

  describe('tryFix - nested directory mismatch', () => {
    it('should detect files with deeper nesting pattern', async () => {
      // Create nested structure: .stitch/designs/home-dashboard/design.html
      const designsDir = join(testDir, '.stitch', 'designs', 'home-dashboard');
      mkdirSync(designsDir, { recursive: true });
      writeFileSync(join(designsDir, 'design.html'), '<html></html>');

      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'blocker',
          missingInputs: ['.stitch/designs/*.html'], // ❌ Won't match
        },
      };

      const result = await strategy.tryFix(gap, ctx);

      expect(result.success).toBe(true);
      expect(result.metadata?.patternFix).toBeDefined();
      expect(result.metadata?.patternFix.originalPattern).toBe('.stitch/designs/*.html');
      // Should suggest one of: .stitch/designs/*/*.html or .stitch/designs/*/design.html
      expect([
        '.stitch/designs/*/*.html',
        '.stitch/designs/*/design.html',
        '.stitch/designs/**/*.html',
      ]).toContain(result.metadata?.patternFix.suggestedPattern);
    });

    it('should handle multiple nested files', async () => {
      // Create multiple nested files
      const screens = ['home-dashboard', 'lesson-tree', 'quiz-interface'];
      for (const screen of screens) {
        const dir = join(testDir, '.stitch', 'designs', screen);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'design.html'), '<html></html>');
      }

      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'blocker',
          missingInputs: ['.stitch/designs/*.html'],
        },
      };

      const result = await strategy.tryFix(gap, ctx);

      expect(result.success).toBe(true);
      expect(result.metadata?.patternFix.matchedFiles).toHaveLength(3);
    });
  });

  describe('tryFix - recursive wildcard needed', () => {
    it('should suggest recursive wildcard for deeply nested files', async () => {
      // Create deeply nested structure
      const deepDir = join(testDir, 'src', 'components', 'ui', 'forms');
      mkdirSync(deepDir, { recursive: true });
      writeFileSync(join(deepDir, 'Input.tsx'), 'export const Input = () => {}');

      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'input',
          missingInputs: ['src/components/*.tsx'], // ❌ Only matches direct children
        },
      };

      const result = await strategy.tryFix(gap, ctx);

      expect(result.success).toBe(true);
      expect(result.metadata?.patternFix.suggestedPattern).toContain('**');
    });
  });

  describe('tryFix - case sensitivity', () => {
    it('should detect case mismatch in directory names', async () => {
      // Create with lowercase 'images' instead of 'Images'
      const dir = join(testDir, 'assets', 'images');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'logo.png'), 'fake png');

      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'blocker',
          missingInputs: ['assets/Images/*.png'], // ❌ Wrong case
        },
      };

      const result = await strategy.tryFix(gap, ctx);

      expect(result.success).toBe(true);
      // Should suggest a pattern that matches the file (could be assets/images/*.png or assets/Images/**/*.png)
      expect(result.metadata?.patternFix.suggestedPattern).toBeDefined();
      expect(result.metadata?.patternFix.matchedFiles).toHaveLength(1);
      expect(result.metadata?.patternFix.matchedFiles[0]).toMatch(/logo\.png$/);
    });
  });

  describe('tryFix - no files exist', () => {
    it('should return failure when no files match any variation', async () => {
      // Don't create any files
      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'blocker',
          missingInputs: ['.stitch/designs/*.html'],
        },
      };

      const result = await strategy.tryFix(gap, ctx);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('No files match pattern');
      expect(result.metadata?.hint).toContain('upstream tasks');
    });
  });

  describe('tryFix - shallower pattern needed', () => {
    it('should suggest removing directory level when pattern is too deep', async () => {
      // Create files at .stitch/designs/*.html (flat)
      const dir = join(testDir, '.stitch', 'designs');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'home.html'), '<html></html>');

      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'blocker',
          missingInputs: ['.stitch/designs/screens/*.html'], // ❌ Too deep
        },
      };

      const result = await strategy.tryFix(gap, ctx);

      expect(result.success).toBe(true);
      expect(result.metadata?.patternFix.suggestedPattern).toBe('.stitch/designs/*.html');
    });
  });

  describe('metadata', () => {
    it('should set retryMode to full (auto-fix then retry)', async () => {
      const dir = join(testDir, '.stitch', 'designs', 'home');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'design.html'), '<html></html>');

      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'blocker',
          missingInputs: ['.stitch/designs/*.html'],
        },
      };

      const result = await strategy.tryFix(gap, ctx);

      expect(result.success).toBe(true);
      expect(result.retryMode).toBe('full');
      expect(result.metadata?.patternFix.autoFixed).toBe(true);
    });

    it('should include matched files in metadata', async () => {
      const dir = join(testDir, '.stitch', 'designs', 'home');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'design.html'), '<html></html>');

      const gap: Gap = {
        id: 'gap-1',
        type: 'missing-dependency',
        description: 'Missing inputs',
        metadata: {
          gapKind: 'blocker',
          missingInputs: ['.stitch/designs/*.html'],
        },
      };

      const result = await strategy.tryFix(gap, ctx);

      expect(result.metadata?.patternFix.matchedFiles).toBeDefined();
      expect(result.metadata?.patternFix.matchedFiles.length).toBeGreaterThan(0);
    });
  });

  describe('priority', () => {
    it('should have priority 8.5', () => {
      expect(strategy.priority).toBe(8.5);
    });
  });

  describe('name', () => {
    it('should have correct strategy name', () => {
      expect(strategy.name).toBe('missing-input-pattern');
    });
  });
});
