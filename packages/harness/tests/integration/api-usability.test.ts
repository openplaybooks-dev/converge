/**
 * API Usability Tests - Real World Scenarios
 *
 * These tests validate the API is clean, intuitive, and works as users expect.
 * We're testing the developer experience, not just functionality.
 *
 * Focus: Find API issues, awkward patterns, missing features
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Unit } from '../../src/unit/index.ts';
import { taskDef } from '../../src/config/task-definition.ts';
import {
  isProjectDefinition,
  isEpicDefinition,
  isTaskDefinition,
  hasYields,
  isLeafDefinition,
} from '../../src/config/task-definition.ts';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('API Usability - Real World Patterns', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `harness-api-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    // Change to test directory so relative paths work
    process.chdir(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Builder API Ergonomics', () => {
    it('should create a simple leaf task with fluent API', () => {
      console.log('\n=== Builder API: Simple Leaf Task ===');

      const task = taskDef()
        .id('analyze-data')
        .title('Analyze Data')
        .agent('data-analyst')
        .prompt('Analyze the CSV files')
        .inputs(['data/*.csv'])
        .outputs(['results/analysis.json'])
        .build();

      expect(task.id).toBe('analyze-data');
      expect(task.agent).toBe('data-analyst');
      expect(task.inputs).toEqual(['data/*.csv']);
    });

    it('should create a parent task with yields', () => {
      const task = taskDef()
        .id('generate-screens')
        .title('Generate All Screens')
        .agent('ui-designer')
        .yields({
          plan: 'Create one task per screen',
          outputDir: '.harness/screens',
          template: '000-screen-{slug}.ts.tpl',
          maxTasks: 20,
        })
        .inputs(['.stitch/SITE.md'])
        .outputs(['.harness/screens/**/*.ts'])
        .build();

      expect(task.vars?.yields).toBeDefined();
      expect((task.vars?.yields as any).maxTasks).toBe(20);
    });

    it('should add multiple checks easily', () => {
      const task = taskDef()
        .id('deploy-app')
        .outputs(['dist/bundle.js', 'dist/index.html'])
        .check({ id: 'bundle-exists', cmd: 'test -f dist/bundle.js' })
        .check({ id: 'bundle-size', cmd: 'test $(stat -f%z dist/bundle.js) -lt 1000000' })
        .check({ id: 'html-exists', cmd: 'test -f dist/index.html' })
        .build();

      const checks = task.checks as any[];
      expect(checks).toHaveLength(3);
      expect(checks[0].id).toBe('bundle-exists');
    });

    it('should support milestone tagging', () => {
      const task = taskDef()
        .id('design-system')
        .title('Create Design System')
        .milestone('html-design')
        .outputs(['.stitch/DESIGN.md'])
        .build();

      expect(task.tags).toContain('milestone:html-design');
    });

    it('should allow custom vars for extensibility', () => {
      const task = taskDef()
        .id('custom-task')
        .vars({
          customField: 'value',
          timeout: 3000,
          retries: 3,
        })
        .build();

      expect(task.vars?.customField).toBe('value');
      expect(task.vars?.timeout).toBe(3000);
    });
  });

  describe('Unit Class API', () => {
    it('should create Unit from TaskDefinition easily', () => {
      const task = taskDef()
        .id('simple-task')
        .inputs(['input.txt'])
        .outputs(['output.txt'])
        .build();

      const unit = new Unit({
        parent: null,
        path: '/test/task',
        taskDef: task,
        config: { maxIterations: 100 },
      });

      expect(unit.id).toBe('simple-task');
      expect(unit.inputs).toEqual(['input.txt']);
    });

    it('should have clean property access (not nested)', () => {
      const def = taskDef()
        .id('test-task')
        .title('Test Task')
        .inputs(['a.txt'])
        .outputs(['b.txt'])
        .agent('developer')
        .build();

      const unit = new Unit({
        parent: null,
        path: '/test',
        taskDef: def,
        config: { maxIterations: 10 },
      });

      expect(unit.id).toBe('test-task');
      expect(unit.agent).toBe('developer');
    });

    it('should support parent/child relationships', () => {
      const parentDef = taskDef().id('parent').build();
      const childDef = taskDef().id('child').build();

      const parent = new Unit({
        parent: null,
        path: '/parent',
        taskDef: parentDef,
        config: { maxIterations: 10 },
      });

      const child = new Unit({
        parent,
        path: '/parent/child',
        taskDef: childDef,
        config: { maxIterations: 10 },
      });

      expect(child.parent).toBe(parent);
      expect(child.parent?.id).toBe('parent');
    });
  });

  describe('Type Guards API', () => {
    it('should identify different unit types', () => {
      const projectDef = taskDef()
        .id('project-root')
        .vars({ projectRoot: process.cwd() })
        .build();

      const parentDef = taskDef()
        .id('parent-task')
        .yields({
          plan: 'Generate children',
          outputDir: '.harness/children',
          template: '000-{id}.ts.tpl',
        })
        .build();

      expect(isProjectDefinition(projectDef)).toBe(true);
      expect(hasYields(parentDef)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw clear error when TaskDefinition missing ID', () => {
      expect(() => {
        taskDef()
          .title('No ID Task')
          .build();
      }).toThrow('requires an id');
    });
  });

  describe('API Consistency', () => {
    it('should use consistent naming across the API', () => {
      const task = taskDef()
        .id('test')
        .inputs(['input.txt'])
        .outputs(['output.txt'])
        .build();

      const unit = new Unit({
        parent: null,
        path: '/test',
        taskDef: task,
        config: { maxIterations: 10 },
      });

      expect(Array.isArray(unit.inputs)).toBe(true);
      expect(Array.isArray(unit.outputs)).toBe(true);
    });

    it('should have sensible defaults', () => {
      const minimalTask = taskDef()
        .id('minimal')
        .build();

      const unit = new Unit({
        parent: null,
        path: '/test',
        taskDef: minimalTask,
        config: { maxIterations: 100 },
      });

      expect(unit.checks ?? []).toEqual([]);
      expect(unit.config.maxIterations).toBe(100);
    });
  });

  describe('.execute() — Unified Execution Entry Point', () => {
    it('should set executorFn via .execute() on TaskDefinitionBuilder', () => {
      const executeFn = async (ctx: any) => {
        await ctx.ai.fn({ prompt: 'Install dependencies' });
      };

      const task = taskDef()
        .id('install-deps')
        .title('Install Dependencies')
        .execute(executeFn)
        .build();

      expect(task.id).toBe('install-deps');
      expect(task.executorFn).toBe(executeFn);
    });

    it('should be equivalent to .executor()', () => {
      const fn = async (ctx: any) => {};

      const viaExecute = taskDef()
        .id('task-a')
        .execute(fn)
        .build();

      const viaExecutor = taskDef()
        .id('task-b')
        .executor(fn)
        .build();

      // Both set executorFn to the same function
      expect(viaExecute.executorFn).toBe(fn);
      expect(viaExecutor.executorFn).toBe(fn);
    });

    it('should chain with other builder methods', () => {
      const fn = async (ctx: any) => {};

      const task = taskDef()
        .id('verify-pages')
        .title('Verify All Pages')
        .description('Check that all pages render correctly')
        .inputs(['.stitch/SITE.md'])
        .outputs(['verification-report.json'])
        .execute(fn)
        .build();

      expect(task.id).toBe('verify-pages');
      expect(task.title).toBe('Verify All Pages');
      expect(task.description).toBe('Check that all pages render correctly');
      expect(task.inputs).toEqual(['.stitch/SITE.md']);
      expect(task.outputs).toEqual(['verification-report.json']);
      expect(task.executorFn).toBe(fn);
    });

    it('should wire through Unit to executorFn', () => {
      const fn = async (ctx: any) => {};

      const def = taskDef()
        .id('my-task')
        .title('My Task')
        .execute(fn)
        .build();

      const unit = new Unit({
        parent: null,
        path: '/test-execute',
        taskDef: def,
        config: { maxIterations: 10 },
      });

      // Unit picks up executorFn from the task definition
      expect(unit.executorFn).toBe(fn);
    });

    it('should work with .harness() for convergence wrapping', () => {
      const fn = async (ctx: any) => {};

      const task = taskDef()
        .id('build-app')
        .title('Build App')
        .outputs(['dist/bundle.js'])
        .execute(fn)
        .harness()   // default harness wrapping
        .build();

      expect(task.executorFn).toBe(fn);
      expect(task.harnessConfig).toEqual({ mode: 'default' });
    });
  });
});
