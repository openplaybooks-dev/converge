export interface RedirectEntry {
  hint: string;
  status: 'removed' | 'renamed';
  exitCode: number;
}

export const MIGRATION_REDIRECTS: Record<string, RedirectEntry> = {
  // --- v1 → v2 migration redirects (spec §10) ---

  'verify': {
    hint: 'use: converge debug',
    status: 'renamed',
    exitCode: 2,
  },
  'verify --fix': {
    hint: 'use: converge debug --fix',
    status: 'renamed',
    exitCode: 2,
  },
  'status': {
    hint: 'use: converge list (or show graph)',
    status: 'renamed',
    exitCode: 2,
  },
  'status --only-incomplete': {
    hint: 'use: converge list',
    status: 'renamed',
    exitCode: 2,
  },
  'reset pb task': {
    hint: 'use: converge clean',
    status: 'renamed',
    exitCode: 2,
  },
  'playbook list': {
    hint: 'use: converge list --playbooks',
    status: 'renamed',
    exitCode: 2,
  },
  'playbook info': {
    hint: 'use: converge inspect playbook',
    status: 'renamed',
    exitCode: 2,
  },
  'playbook history': {
    hint: 'use: converge show trend',
    status: 'renamed',
    exitCode: 2,
  },
  'skills list': {
    hint: 'use: converge deps list',
    status: 'renamed',
    exitCode: 2,
  },
  'skills install': {
    hint: 'use: converge deps install',
    status: 'renamed',
    exitCode: 2,
  },
  'cleanup': {
    hint: 'use: converge clean --orphaned',
    status: 'renamed',
    exitCode: 2,
  },
  'plan': {
    hint: 'use: converge init --from-prompt',
    status: 'renamed',
    exitCode: 2,
  },
  'checkpoint': {
    hint: 'use: converge inspect checkpoint',
    status: 'renamed',
    exitCode: 2,
  },
  'plugins': {
    hint: 'use: converge deps list',
    status: 'renamed',
    exitCode: 2,
  },

  // --- Legacy redirects (absorbed from main.ts) ---

  'tree': {
    hint: '"tree" has moved. Use "converge status" instead.',
    status: 'renamed',
    exitCode: 2,
  },
  'gantt': {
    hint: 'Use "converge show gantt" instead.',
    status: 'renamed',
    exitCode: 2,
  },
  'graph': {
    hint: 'Use "converge show graph" instead.',
    status: 'renamed',
    exitCode: 2,
  },
  'journal': {
    hint: 'Use "converge show journal" instead.',
    status: 'renamed',
    exitCode: 2,
  },
  'backlog': {
    hint: 'Use "converge show backlog" instead.',
    status: 'renamed',
    exitCode: 2,
  },
  'trend': {
    hint: 'Use "converge show trend" instead.',
    status: 'renamed',
    exitCode: 2,
  },
  'timeline': {
    hint: '"timeline" was removed. Use "converge inspect" instead.',
    status: 'removed',
    exitCode: 2,
  },
  'validate': {
    hint: 'Did you mean "converge verify"?',
    status: 'renamed',
    exitCode: 2,
  },
  'workflow': {
    hint: '"workflow" does not exist. Use "converge playbook" instead.',
    status: 'removed',
    exitCode: 2,
  },
};
