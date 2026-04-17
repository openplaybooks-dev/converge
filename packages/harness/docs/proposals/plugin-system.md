# Proposal: Plugin System for crew

**Status:** Draft
**Author:** crew team
**Date:** 2026-03-06

---

## Summary

Introduce a **plugin system** that lets users compose project configuration from reusable, stackable tech-stack plugins. Instead of writing checks, task types, hooks, and vars from scratch in `.harness/setup/index.js`, users declare plugins like `typescript`, `nextjs`, `git`, `docker` — and the framework merges their contributions into a unified configuration.

```json
{
  "name": "my-app",
  "plugins": ["typescript", "nextjs", "git", "docker"]
}
```

```bash
crew init
# → TypeScript checks registered (tsc)
# → Next.js checks registered (build, lint)
# → Git hooks registered (auto-commit on task complete)
# → Docker checks registered (docker-build)
```

## Motivation

### The Problem

Today, every project must manually define checks, task types, and hooks in `.harness/setup/index.js`:

```javascript
export const checks = {
  tsc: async (ctx) => { /* ... */ },
  build: async (ctx) => { /* ... */ },
  lint: async (ctx) => { /* ... */ },
};

export const taskTypes = {
  coding: { name: 'coding', defaults: { skill: 'coding-agent' }, checks: ['tsc'] },
};

export const hooks = {
  async beforeTask(ctx) { /* ... */ },
};
```

This setup is:

- **Repetitive** — the same `tsc` check is copy-pasted across TypeScript projects
- **Not composable** — adding Next.js to an existing TypeScript setup means manually merging configurations
- **Not shareable** — there's no standard way to package and distribute a configuration preset
- **Error-prone** — forgetting a check or misconfiguring a hook is common

### The Solution

Plugins encapsulate reusable configuration units. Each plugin contributes:

| Contribution | Example |
|---|---|
| **Checks** | `tsc`, `eslint`, `next build`, `docker build` |
| **Task types** | `coding` (with `tsc` check), `deploy` (with docker checks) |
| **Hooks** | Auto-install deps before coding tasks, auto-commit after task completion |
| **Vars** | `nodeVersion: '20'`, `framework: 'nextjs'` |
| **Tools** | Plugin-specific tools injected into `TaskContext.tools` |

Users stack plugins — the framework deep-merges their contributions in declaration order.

## Design

### Plugin Interface

```typescript
export interface HarnessPlugin {
  /** Unique plugin name (e.g., "typescript", "nextjs") */
  name: string;

  /** Semver version */
  version: string;

  /** Human-readable description */
  description?: string;

  /** Plugins this one requires to be loaded first */
  requires?: string[];

  /**
   * Called during plugin initialization.
   * Receives the plugin API for registering checks, types, hooks, etc.
   */
  setup(api: PluginAPI): void | Promise<void>;
}
```

### Plugin API

The `PluginAPI` is the surface plugins use to contribute configuration:

```typescript
export interface PluginAPI {
  /** Register named checks */
  addCheck(name: string, plugin: CheckPlugin): void;
  addChecks(checks: CheckRegistry): void;

  /** Register task types */
  addTaskType(type: TaskType): void;

  /** Extend an existing task type with additional hooks/checks */
  extendTaskType(name: string, extension: TaskTypeExtension): void;

  /** Register project-level hooks */
  addHook(event: HookEvent, fn: HookFn): void;

  /** Set default plan variables */
  addVars(vars: Record<string, unknown>): void;

  /** Register custom tools available in TaskContext */
  addTool(name: string, factory: ToolFactory): void;

  /** Read a var set by a previously loaded plugin */
  getVar(key: string): unknown;

  /** Check if another plugin is loaded */
  hasPlugin(name: string): boolean;

  /** Project root path */
  readonly projectDir: string;
}

export type HookEvent =
  | 'beforeTask'
  | 'afterTask'
  | 'beforeEpic'
  | 'afterEpic'
  | 'beforePlan'
  | 'afterPlan'
  | 'onTaskFail';

export type HookFn = (ctx: TaskContext, ...args: unknown[]) => void | Promise<void>;
export type ToolFactory = (ctx: TaskContext) => unknown;
```

### Plugin Resolution

Plugins can be specified in three ways:

```jsonc
// harness.json
{
  "plugins": [
    // 1. Built-in plugin by name
    "typescript",

    // 2. npm package
    "@crew/plugin-docker",

    // 3. Local file path
    "./plugins/custom-plugin.js"
  ]
}
```

Resolution order:

1. **Built-in** — check `crew/plugins/{name}.js` for bundled presets
2. **npm** — `require(name)` / `import(name)` from `node_modules`
3. **Local** — resolve relative to `harness.json` location

### Plugin Loading & Merge Order

Plugins load in declaration order. Later plugins override earlier ones for same-named checks/types, but **hooks accumulate** (all run in order).

```
Plugin A (typescript)  →  registers: tsc check, coding type
Plugin B (nextjs)      →  registers: build check, extends coding type with lint
Plugin C (git)         →  registers: afterTask hook (auto-commit)
Plugin D (docker)      →  registers: docker-build check, deploy type

Final merged config:
  checks:     { tsc, build, lint, docker-build }
  taskTypes:  { coding (tsc + lint), deploy (docker-build) }
  hooks:      { afterTask: [git.autoCommit] }
  vars:       { nodeVersion: '20', framework: 'nextjs' }
```

### Dependency Resolution

Plugins declare dependencies via `requires`:

```typescript
const nextjsPlugin: HarnessPlugin = {
  name: 'nextjs',
  version: '1.0.0',
  requires: ['typescript'],  // typescript must load first
  setup(api) {
    // Can assume tsc check exists
    api.extendTaskType('coding', { checks: ['lint', 'build'] });
  },
};
```

The loader performs a topological sort. If dependencies are missing, it throws with a clear message:

```
Error: Plugin "nextjs" requires "typescript", but it is not in the plugins list.
Add "typescript" before "nextjs" in harness.json plugins array.
```

Circular dependencies are detected and rejected.

### Plugin Configuration

Plugins can accept user-provided options via the object syntax:

```jsonc
{
  "plugins": [
    "typescript",
    ["nextjs", { "appDir": true, "turbopack": false }],
    ["docker", { "registry": "ghcr.io/myorg" }]
  ]
}
```

The options are passed to the `setup` function via the API:

```typescript
export interface PluginAPI {
  /** Options passed from harness.json plugin configuration */
  readonly options: Record<string, unknown>;
  // ... rest of API
}
```

## Built-in Plugins

The framework ships with common plugins so most projects need zero manual setup.

### `typescript`

```typescript
export default {
  name: 'typescript',
  version: '1.0.0',
  description: 'TypeScript type checking and coding task type',
  setup(api) {
    api.addCheck('tsc', async (ctx) => {
      const r = await ctx.tools.shell.run('npx tsc --noEmit');
      return { passed: r.exitCode === 0, output: r.stderr };
    });

    api.addTaskType({
      name: 'coding',
      description: 'Implementation tasks with TypeScript checks',
      defaults: { skill: 'coding-agent' },
      checks: ['tsc'],
    });

    api.addVars({ language: 'typescript' });
  },
};
```

### `nextjs`

```typescript
export default {
  name: 'nextjs',
  version: '1.0.0',
  description: 'Next.js build and lint checks',
  requires: ['typescript'],
  setup(api) {
    const opts = api.options as { appDir?: boolean };

    api.addCheck('build', async (ctx) => {
      const r = await ctx.tools.shell.run('npx next build');
      return { passed: r.exitCode === 0, output: r.stderr };
    });

    api.addCheck('lint', async (ctx) => {
      const r = await ctx.tools.shell.run('npx next lint');
      return { passed: r.exitCode === 0, output: r.stdout };
    });

    api.extendTaskType('coding', { checks: ['lint'] });

    api.addVars({
      framework: 'nextjs',
      appDir: opts?.appDir ?? true,
    });
  },
};
```

### `git`

```typescript
export default {
  name: 'git',
  version: '1.0.0',
  description: 'Git auto-commit after task completion',
  setup(api) {
    const opts = api.options as { autoCommit?: boolean; commitPrefix?: string };
    const autoCommit = opts?.autoCommit ?? true;
    const prefix = opts?.commitPrefix ?? 'crew';

    if (autoCommit) {
      api.addHook('afterTask', async (ctx) => {
        const status = await ctx.tools.git.status();
        if (status.trim()) {
          await ctx.tools.git.add(['.']);
          await ctx.tools.git.commit(
            `${prefix}: complete task ${ctx.taskId} — ${ctx.task.title}`
          );
        }
      });
    }

    api.addCheck('git-clean', async (ctx) => {
      const status = await ctx.tools.shell.run('git status --porcelain');
      return {
        passed: status.stdout.trim() === '',
        output: status.stdout || 'Working tree clean',
      };
    });
  },
};
```

### `docker`

```typescript
export default {
  name: 'docker',
  version: '1.0.0',
  description: 'Docker build verification and deploy task type',
  setup(api) {
    const opts = api.options as {
      dockerfile?: string;
      registry?: string;
      imageName?: string;
    };

    const dockerfile = opts?.dockerfile ?? 'Dockerfile';
    const imageName = opts?.imageName ?? 'app';

    api.addCheck('docker-build', async (ctx) => {
      const r = await ctx.tools.shell.run(
        `docker build -f ${dockerfile} -t ${imageName}:check .`
      );
      return { passed: r.exitCode === 0, output: r.stderr };
    });

    api.addCheck('docker-run', async (ctx) => {
      const r = await ctx.tools.shell.run(
        `docker run --rm ${imageName}:check echo "Container starts OK"`
      );
      return { passed: r.exitCode === 0, output: r.stdout };
    });

    api.addTaskType({
      name: 'deploy',
      description: 'Deployment tasks with Docker verification',
      defaults: { skill: 'deploy-agent' },
      checks: ['docker-build'],
    });
  },
};
```

### `eslint`

```typescript
export default {
  name: 'eslint',
  version: '1.0.0',
  description: 'ESLint code quality checks',
  setup(api) {
    const opts = api.options as { fix?: boolean; extensions?: string[] };
    const fix = opts?.fix ?? false;
    const extensions = opts?.extensions ?? ['.ts', '.tsx', '.js', '.jsx'];

    api.addCheck('eslint', async (ctx) => {
      const ext = extensions.map(e => `--ext ${e}`).join(' ');
      const fixFlag = fix ? '--fix' : '';
      const r = await ctx.tools.shell.run(`npx eslint ${ext} ${fixFlag} src/`);
      return { passed: r.exitCode === 0, output: r.stdout };
    });
  },
};
```

### `vitest`

```typescript
export default {
  name: 'vitest',
  version: '1.0.0',
  description: 'Vitest test runner',
  setup(api) {
    api.addCheck('test', async (ctx) => {
      const r = await ctx.tools.shell.run('npx vitest run');
      return { passed: r.exitCode === 0, output: r.stdout };
    });

    api.extendTaskType('coding', { checks: ['test'] });
  },
};
```

## Usage Examples

### Minimal Next.js Project

```jsonc
// harness.json
{
  "name": "my-nextjs-app",
  "plugins": ["typescript", "nextjs", "git"]
}
```

This single declaration gives you:
- `tsc` check on all `coding` tasks
- `build` and `lint` checks from Next.js
- Auto-commit after each task completion
- `coding` task type with all checks merged

### Full-Stack with Docker

```jsonc
{
  "name": "fullstack-app",
  "plugins": [
    "typescript",
    ["nextjs", { "appDir": true }],
    "eslint",
    "vitest",
    ["git", { "commitPrefix": "chore(crew)" }],
    ["docker", { "registry": "ghcr.io/myorg", "imageName": "fullstack-app" }]
  ]
}
```

### Custom Plugin + Built-ins

```jsonc
{
  "name": "my-app",
  "plugins": [
    "typescript",
    "nextjs",
    "./plugins/my-db-checks.js"
  ]
}
```

```javascript
// ./plugins/my-db-checks.js
export default {
  name: 'db-checks',
  version: '1.0.0',
  setup(api) {
    api.addCheck('db-migrate', async (ctx) => {
      const r = await ctx.tools.shell.run('npx prisma migrate deploy');
      return { passed: r.exitCode === 0, output: r.stderr };
    });

    api.addCheck('db-seed', async (ctx) => {
      const r = await ctx.tools.shell.run('npx prisma db seed');
      return { passed: r.exitCode === 0, output: r.stdout };
    });
  },
};
```

### Plugins + Manual Setup (Additive)

Plugins don't replace `.harness/setup/index.js` — they complement it. Manual setup always runs **after** plugins, so it can override or extend anything:

```javascript
// .harness/setup/index.js
// Plugins already registered tsc, build, lint checks.
// This file adds project-specific customization on top.

export const checks = {
  'e2e': async (ctx) => {
    const r = await ctx.tools.shell.run('npx playwright test');
    return { passed: r.exitCode === 0, output: r.stdout };
  },
};

export const hooks = {
  async beforeTask(ctx) {
    // custom project logic runs in addition to plugin hooks
  },
};
```

## Integration with Existing Systems

### How Plugins Map to Existing Registries

The plugin system is a **composition layer on top of existing registries**. Internally, `api.addCheck()` calls `registerCheck()`, `api.addTaskType()` calls `registerTaskType()`, etc. No new registries are created.

```
harness.json plugins: ["typescript", "nextjs"]
         ↓
  PluginLoader.loadAll()
         ↓
  typescript.setup(api)  →  api.addCheck('tsc', ...)     →  registerCheck('tsc', ...)
                          →  api.addTaskType('coding', ...)→  registerTaskType(...)
         ↓
  nextjs.setup(api)      →  api.addCheck('build', ...)    →  registerCheck('build', ...)
                          →  api.extendTaskType('coding')  →  extendTaskType(...)
         ↓
  .harness/setup/index.js   →  (manual overrides/additions)
```

### Config Loader Changes

The existing `loadConfig()` function gains a plugin loading phase:

```typescript
// config-loader.ts (updated flow)
export async function loadConfig(projectDir: string) {
  const config = readCrewJson(projectDir);

  // NEW: Load and initialize plugins before setup script
  if (config.plugins) {
    await loadPlugins(config.plugins, projectDir);
  }

  // Existing: Load setup script (overrides/extends plugin config)
  if (config.setup) {
    await loadSetup(config.setup, projectDir);
  }
}
```

### CLI Changes

```bash
# List loaded plugins and their contributions
crew plugins

# Output:
# Plugins (3):
#   typescript@1.0.0 — TypeScript type checking and coding task type
#     checks: tsc
#     types:  coding
#
#   nextjs@1.0.0 — Next.js build and lint checks (requires: typescript)
#     checks: build, lint
#     extends: coding (+lint)
#
#   git@1.0.0 — Git auto-commit after task completion
#     hooks:  afterTask
#     checks: git-clean
```

## Implementation Plan

### Phase 1: Core Plugin Infrastructure
1. Define `HarnessPlugin` and `PluginAPI` interfaces in `src/plugins/types.ts`
2. Implement `PluginLoader` in `src/plugins/loader.ts` — resolution, dependency sort, loading
3. Implement `PluginAPIImpl` in `src/plugins/api.ts` — bridges plugin calls to existing registries
4. Update `config-loader.ts` to call plugin loader before setup script

### Phase 2: Built-in Plugins
5. Create `src/plugins/builtins/typescript.ts`
6. Create `src/plugins/builtins/nextjs.ts`
7. Create `src/plugins/builtins/git.ts`
8. Create `src/plugins/builtins/docker.ts`
9. Create `src/plugins/builtins/eslint.ts`
10. Create `src/plugins/builtins/vitest.ts`

### Phase 3: CLI & DX
11. Add `harness plugins` command
12. Update `harness init` to offer plugin selection
13. Update documentation

## Design Decisions

### Why Not a Separate Plugin Registry?

Plugins call straight into existing registries (`registerCheck`, `registerTaskType`, etc.). This means:
- Zero migration for existing projects
- Plugin contributions are indistinguishable from manual setup
- No new abstraction layer to maintain

### Why Declaration Order Instead of Priority Numbers?

- Simpler mental model — "later wins" is easy to reason about
- Matches how CSS cascades and how middleware stacks work
- Dependency resolution handles the constraint case (`requires`)

### Why Hooks Accumulate Instead of Override?

Checks and task types are **identity-based** (keyed by name) — later definitions override earlier ones. Hooks are **behavioral** — you generally want all hooks to run (e.g., git auto-commit AND custom logging). This matches the existing hook resolution chain behavior.

### Why Built-in Plugins Instead of npm-only?

- Zero-install experience for common stacks
- Bundled with the framework, always available
- Users can override built-ins with custom plugins of the same name

## Open Questions

1. **Should plugins be able to contribute epics/tasks to the plan?** Currently plugins only contribute infrastructure (checks, types, hooks). Adding plan contributions would be powerful but adds complexity.

2. **Plugin versioning** — should we enforce semver compatibility between plugin requirements, or keep it simple with name-only dependencies?

3. **Plugin marketplace** — should we define a registry format for discovering community plugins, or rely on npm discovery?
