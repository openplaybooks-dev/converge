// WBS for 03-execution-verbs.
//
// Spawns one container task per verb. Each container has a 01-red /
// 02-green pair instantiated from wbs/templates/verb/. The verbs:
//   run    — execute selected tasks via the convergence loop
//   build  — run + check + repair, fail-fast
//   test   — run only checks: of selected tasks
//   retry  — re-run anything with status: error in run_results.json
//   clean  — delete journal state for selected tasks
//
// Each instance pulls in the same red/green template; the {{verb}} var
// substitutes throughout the templated TASK.md so each container's
// children point at verb-specific test files and source files.

const TEMPLATE_ROOT =
  '.converge/playbooks/cli-redesign/tasks/03-execution-verbs/wbs/templates/verb';
const PARENT_BASE =
  '.converge/playbooks/cli-redesign/tasks/03-execution-verbs';

const VERBS = [
  {
    id: 'run',
    description: 'Execute selected tasks via the convergence loop.',
    test_file: 'tests/integration/run-select.test.ts',
    source_file: 'src/commands-run.ts',
    extra_assertions: [
      'run --select tag:trivial executes only trivial-task',
      'run --select <substr> still works (name: default)',
      'run --step + --select runs one iteration of the first match',
    ],
  },
  {
    id: 'build',
    description: 'Run + check + repair, --fail-fast on by default.',
    test_file: 'tests/integration/build.test.ts',
    source_file: 'src/commands-build.ts',
    extra_assertions: [
      'build exits non-zero on first uncorrectable failure',
      'build --select tag:trivial succeeds when trivial-task succeeds',
    ],
  },
  {
    id: 'test',
    description: 'Run only the checks: block of selected tasks.',
    test_file: 'tests/integration/test-verb.test.ts',
    source_file: 'src/commands-test.ts',
    extra_assertions: [
      'test does not invoke task executors (no LLM calls, no mutations)',
      'test reports per-task pass/fail per check',
    ],
  },
  {
    id: 'retry',
    description: "Re-run anything with status: 'error' in target/run_results.json.",
    test_file: 'tests/integration/retry.test.ts',
    source_file: 'src/commands-retry.ts',
    extra_assertions: [
      "retry without prior run_results.json exits non-zero with 'no prior run' message",
      'retry equals run --select result:error+ when run_results exists',
    ],
  },
  {
    id: 'clean',
    description: "Delete journal state for selected tasks. Replaces today's --restart and reset.",
    test_file: 'tests/integration/clean.test.ts',
    source_file: 'src/commands-clean.ts',
    extra_assertions: [
      'clean --select <expr> removes journal subtree for matching tasks',
      'clean --orphaned removes tasks not present in current playbook',
    ],
  },
];

export async function run(ctx) {
  for (const v of VERBS) {
    const id = v.id;
    const vars = {
      verb: id,
      verb_description: v.description,
      test_file: v.test_file,
      source_file: v.source_file,
      extra_assertions: v.extra_assertions.map((s) => `- ${s}`).join('\n'),
    };

    // Spawn the verb container (stub TASK.md describing the verb scope).
    await ctx.spawn(
      { _type: 'template-ref', path: `${TEMPLATE_ROOT}/TASK.md`, vars },
      { id, writeToPath: `${PARENT_BASE}/${id}/TASK.md` },
    );
    // Spawn the red and green leaves under it.
    await ctx.spawn(
      { _type: 'template-ref', path: `${TEMPLATE_ROOT}/01-red/TASK.md`, vars },
      { id: `${id}/01-red`, writeToPath: `${PARENT_BASE}/${id}/01-red/TASK.md` },
    );
    await ctx.spawn(
      { _type: 'template-ref', path: `${TEMPLATE_ROOT}/02-green/TASK.md`, vars },
      { id: `${id}/02-green`, writeToPath: `${PARENT_BASE}/${id}/02-green/TASK.md` },
    );
  }
}
