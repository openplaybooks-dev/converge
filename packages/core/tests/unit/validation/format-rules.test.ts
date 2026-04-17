import { describe, it, expect } from 'vitest';
import { formatRules } from '../../../src/validation/rules/format.ts';
import type { TaskValidationInput } from '../../../src/validation/types.ts';
import type { TaskMdShape } from '../../../src/config/task-md-definition.ts';

/** Build a minimal TaskValidationInput for testing */
function makeInput(
  shape: Partial<TaskMdShape> & { id: string },
  rawFrontmatter: Record<string, unknown> = {},
): TaskValidationInput {
  return {
    shape: shape as TaskMdShape,
    rawFrontmatter,
    filePath: '/project/.converge/epics/01/001-test/TASK.md',
    taskDir: '/project/.converge/epics/01/001-test',
    projectDir: '/project',
  };
}

function runRule(ruleId: string, input: TaskValidationInput) {
  const rule = formatRules.find(r => r.id === ruleId);
  if (!rule) throw new Error(`Rule "${ruleId}" not found`);
  return rule.check(input);
}

describe('format rules', () => {
  describe('id-required', () => {
    it('flags empty id', () => {
      const issues = runRule('id-required', makeInput({ id: '' }));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
    });

    it('passes with valid id', () => {
      const issues = runRule('id-required', makeInput({ id: '001-test' }));
      expect(issues).toHaveLength(0);
    });
  });

  describe('id-format', () => {
    it('flags non-standard id', () => {
      const issues = runRule('id-format', makeInput({ id: 'myTask' }));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
    });

    it('passes with NNN-kebab format', () => {
      const issues = runRule('id-format', makeInput({ id: '001-my-task' }));
      expect(issues).toHaveLength(0);
    });

    it('passes with NN-kebab format (epic-level task)', () => {
      const issues = runRule('id-format', makeInput({ id: '01-prepare-requirements' }));
      expect(issues).toHaveLength(0);
    });

    it('skips empty id (handled by id-required)', () => {
      const issues = runRule('id-format', makeInput({ id: '' }));
      expect(issues).toHaveLength(0);
    });
  });

  describe('title-is-string', () => {
    it('flags non-string title', () => {
      const issues = runRule('title-is-string', makeInput(
        { id: '001-test' },
        { title: 123 },
      ));
      expect(issues).toHaveLength(1);
    });

    it('passes with string title', () => {
      const issues = runRule('title-is-string', makeInput(
        { id: '001-test' },
        { title: 'My Task' },
      ));
      expect(issues).toHaveLength(0);
    });

    it('passes when title is absent', () => {
      const issues = runRule('title-is-string', makeInput({ id: '001-test' }, {}));
      expect(issues).toHaveLength(0);
    });
  });

  describe('array field rules', () => {
    const arrayFields = [
      'skills-is-array',
      'dependencies-is-array',
      'inputs-is-array',
      'outputs-is-array',
      'tags-is-array',
      'materials-is-array',
    ];

    for (const ruleId of arrayFields) {
      const field = ruleId.replace('-is-array', '');

      it(`${ruleId}: flags non-array ${field}`, () => {
        const issues = runRule(ruleId, makeInput(
          { id: '001-test' },
          { [field]: 'not-an-array' },
        ));
        expect(issues).toHaveLength(1);
        expect(issues[0].severity).toBe('error');
      });

      it(`${ruleId}: passes with array ${field}`, () => {
        const issues = runRule(ruleId, makeInput(
          { id: '001-test' },
          { [field]: ['item'] },
        ));
        expect(issues).toHaveLength(0);
      });

      it(`${ruleId}: passes when ${field} is absent`, () => {
        const issues = runRule(ruleId, makeInput({ id: '001-test' }, {}));
        expect(issues).toHaveLength(0);
      });
    }
  });

  describe('blocking-is-boolean', () => {
    it('flags non-boolean blocking', () => {
      const issues = runRule('blocking-is-boolean', makeInput(
        { id: '001-test' },
        { blocking: 'yes' },
      ));
      expect(issues).toHaveLength(1);
    });

    it('passes with boolean blocking', () => {
      const issues = runRule('blocking-is-boolean', makeInput(
        { id: '001-test' },
        { blocking: true },
      ));
      expect(issues).toHaveLength(0);
    });
  });

  describe('executor-type-valid', () => {
    it('flags unknown executor type', () => {
      const issues = runRule('executor-type-valid', makeInput(
        { id: '001-test' },
        { executor: { type: 'python' } },
      ));
      expect(issues).toHaveLength(1);
    });

    it('passes with valid executor type', () => {
      for (const type of ['ai', 'script', 'function']) {
        const issues = runRule('executor-type-valid', makeInput(
          { id: '001-test' },
          { executor: { type } },
        ));
        expect(issues).toHaveLength(0);
      }
    });
  });

  describe('wbs-type-valid', () => {
    it('flags unknown wbs type', () => {
      const issues = runRule('wbs-type-valid', makeInput(
        { id: '001-test' },
        { wbs: { type: 'python', path: './wbs.py' } },
      ));
      expect(issues).toHaveLength(1);
    });

    it('passes with valid wbs type', () => {
      const issues = runRule('wbs-type-valid', makeInput(
        { id: '001-test' },
        { wbs: { type: 'nodejs', path: './wbs.js' } },
      ));
      expect(issues).toHaveLength(0);
    });
  });

  describe('wbs-path-required', () => {
    it('flags missing wbs path', () => {
      const issues = runRule('wbs-path-required', makeInput(
        { id: '001-test' },
        { wbs: { type: 'nodejs' } },
      ));
      expect(issues).toHaveLength(1);
    });

    it('passes with wbs path', () => {
      const issues = runRule('wbs-path-required', makeInput(
        { id: '001-test' },
        { wbs: { type: 'nodejs', path: './wbs.js' } },
      ));
      expect(issues).toHaveLength(0);
    });
  });

  describe('checks-shape', () => {
    it('flags check entry without id', () => {
      const issues = runRule('checks-shape', makeInput(
        { id: '001-test' },
        { checks: [{ cmd: 'npm test' }, { id: 'lint', cmd: 'npm run lint' }] },
      ));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('checks[0]');
    });

    it('passes with valid checks', () => {
      const issues = runRule('checks-shape', makeInput(
        { id: '001-test' },
        { checks: [{ id: 'lint', cmd: 'npm run lint' }] },
      ));
      expect(issues).toHaveLength(0);
    });
  });

  describe('needs-shape', () => {
    it('flags needs entry without id', () => {
      const issues = runRule('needs-shape', makeInput(
        { id: '001-test' },
        { needs: [{ cmd: 'which node' }] },
      ));
      expect(issues).toHaveLength(1);
    });
  });

  describe('correction-budget-positive', () => {
    it('flags negative budget', () => {
      const issues = runRule('correction-budget-positive', makeInput(
        { id: '001-test' },
        { 'correction-budget': -1 },
      ));
      expect(issues).toHaveLength(1);
    });

    it('flags zero budget', () => {
      const issues = runRule('correction-budget-positive', makeInput(
        { id: '001-test' },
        { 'correction-budget': 0 },
      ));
      expect(issues).toHaveLength(1);
    });

    it('flags non-number budget', () => {
      const issues = runRule('correction-budget-positive', makeInput(
        { id: '001-test' },
        { 'correction-budget': 'five' },
      ));
      expect(issues).toHaveLength(1);
    });

    it('passes with positive budget', () => {
      const issues = runRule('correction-budget-positive', makeInput(
        { id: '001-test' },
        { 'correction-budget': 3 },
      ));
      expect(issues).toHaveLength(0);
    });
  });

  describe('unknown-reserved-like-key', () => {
    it('flags typo of reserved key', () => {
      const issues = runRule('unknown-reserved-like-key', makeInput(
        { id: '001-test' },
        { depndencies: ['foo'] }, // typo of "dependencies"
      ));
      expect(issues).toHaveLength(1);
      expect(issues[0].expected).toBe('dependencies');
    });

    it('does not flag actual reserved keys', () => {
      const issues = runRule('unknown-reserved-like-key', makeInput(
        { id: '001-test' },
        { dependencies: ['foo'], title: 'Test' },
      ));
      expect(issues).toHaveLength(0);
    });

    it('does not flag unrelated custom keys', () => {
      const issues = runRule('unknown-reserved-like-key', makeInput(
        { id: '001-test' },
        { myCustomVariable: 'hello' },
      ));
      expect(issues).toHaveLength(0);
    });
  });
});
