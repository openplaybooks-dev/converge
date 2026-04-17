import { describe, it, expect } from 'vitest';
import { projectRules } from '../../../src/validation/rules/project.ts';
import type { TaskValidationInput } from '../../../src/validation/types.ts';
import type { TaskMdShape } from '../../../src/config/task-md-definition.ts';

function makeInput(
  shape: Partial<TaskMdShape> & { id: string },
  overrides: Partial<TaskValidationInput> = {},
): TaskValidationInput {
  const id = shape.id;
  return {
    shape: shape as TaskMdShape,
    rawFrontmatter: {},
    filePath: `/project/.harness/epics/01/${id}/TASK.md`,
    taskDir: `/project/.harness/epics/01/${id}`,
    projectDir: '/project',
    ...overrides,
  };
}

function runProjectRule(ruleId: string, tasks: TaskValidationInput[], projectDir = '/project') {
  const rule = projectRules.find(r => r.id === ruleId);
  if (!rule) throw new Error(`Rule "${ruleId}" not found`);
  return rule.check(tasks, projectDir);
}

describe('project rules', () => {
  describe('duplicate-task-ids', () => {
    it('flags duplicate task ids', () => {
      const tasks = [
        makeInput({ id: '001-setup' }),
        makeInput({ id: '001-setup' }, {
          filePath: '/project/.harness/epics/02/001-setup/TASK.md',
          taskDir: '/project/.harness/epics/02/001-setup',
        }),
      ];
      const issues = runProjectRule('duplicate-task-ids', tasks);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
    });

    it('passes with unique task ids', () => {
      const tasks = [
        makeInput({ id: '001-setup' }),
        makeInput({ id: '002-build' }),
      ];
      const issues = runProjectRule('duplicate-task-ids', tasks);
      expect(issues).toHaveLength(0);
    });
  });

  describe('dangling-dependency', () => {
    it('flags dependency on non-existent task', () => {
      const tasks = [
        makeInput({ id: '001-setup', dependencies: ['000-init'] }),
        makeInput({ id: '002-build', dependencies: ['001-setup'] }),
      ];
      const issues = runProjectRule('dangling-dependency', tasks);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('000-init');
    });

    it('passes when all dependencies exist', () => {
      const tasks = [
        makeInput({ id: '001-setup' }),
        makeInput({ id: '002-build', dependencies: ['001-setup'] }),
      ];
      const issues = runProjectRule('dangling-dependency', tasks);
      expect(issues).toHaveLength(0);
    });
  });

  describe('circular-dependencies', () => {
    it('detects simple cycle', () => {
      const tasks = [
        makeInput({ id: '001-a', dependencies: ['002-b'] }),
        makeInput({ id: '002-b', dependencies: ['001-a'] }),
      ];
      const issues = runProjectRule('circular-dependencies', tasks);
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].message).toContain('Cycle detected');
    });

    it('detects three-node cycle', () => {
      const tasks = [
        makeInput({ id: '001-a', dependencies: ['003-c'] }),
        makeInput({ id: '002-b', dependencies: ['001-a'] }),
        makeInput({ id: '003-c', dependencies: ['002-b'] }),
      ];
      const issues = runProjectRule('circular-dependencies', tasks);
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    it('passes with no cycle', () => {
      const tasks = [
        makeInput({ id: '001-a' }),
        makeInput({ id: '002-b', dependencies: ['001-a'] }),
        makeInput({ id: '003-c', dependencies: ['002-b'] }),
      ];
      const issues = runProjectRule('circular-dependencies', tasks);
      expect(issues).toHaveLength(0);
    });
  });

  describe('orphan-inputs', () => {
    it('flags inputs not produced by any task', () => {
      const tasks = [
        makeInput({
          id: '001-setup',
          outputs: ['src/config.ts'],
        }),
        makeInput({
          id: '002-build',
          inputs: ['src/config.ts', 'src/missing.ts'],
        }),
      ];
      const issues = runProjectRule('orphan-inputs', tasks);
      expect(issues).toHaveLength(1);
      expect(issues[0].actual).toBe('src/missing.ts');
    });

    it('passes when all inputs are produced', () => {
      const tasks = [
        makeInput({
          id: '001-setup',
          outputs: ['src/config.ts'],
        }),
        makeInput({
          id: '002-build',
          inputs: ['src/config.ts'],
        }),
      ];
      const issues = runProjectRule('orphan-inputs', tasks);
      expect(issues).toHaveLength(0);
    });
  });

  describe('ordering-gap', () => {
    it('detects numbering gaps', () => {
      const tasks = [
        makeInput({ id: '001-setup' }),
        makeInput({ id: '002-build' }),
        makeInput({ id: '005-deploy' }),
      ];
      const issues = runProjectRule('ordering-gap', tasks);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('003');
    });

    it('passes with sequential numbering', () => {
      const tasks = [
        makeInput({ id: '001-setup' }),
        makeInput({ id: '002-build' }),
        makeInput({ id: '003-test' }),
      ];
      const issues = runProjectRule('ordering-gap', tasks);
      expect(issues).toHaveLength(0);
    });
  });
});
