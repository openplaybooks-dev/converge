# Converge Plugin System

Plugins extend Converge by hooking into the framework's lifecycle, registering custom check types, intercepting task execution, exporting telemetry, and adding CLI commands.

## Quick start

Create `.converge/plugins/my-plugin/index.ts`:

```typescript
import type { ConvergePluginV2 } from "@openplaybooks/converge-core";

const myPlugin: ConvergePluginV2 = {
  name: "my-plugin",
  version: "1.0.0",
  description: "My custom plugin",
  capabilities: ["hooks", "check-types"],

  setup(api) {
    api.addHook("task:complete", async ({ ctx, result }) => {
      console.log(`${ctx.taskId} done in ${result.durationMs}ms`);
    });

    api.registerCheckType("http", async (check, ctx) => {
      const res = await fetch(check.cmd as string);
      return { passed: res.ok, output: `${res.status}` };
    });
  },
};

export default myPlugin;
```

Add it to `project.yaml`:

```yaml
plugins:
  - my-plugin
```

## Plugin interface

```typescript
interface ConvergePluginV2 {
  name: string;
  version: string;
  description?: string;
  requires?: string[];              // other plugins that must load first
  capabilities?: PluginCapability[];  // declares which APIs the plugin uses

  setup(api: PluginAPIV2): void | Promise<void>;
  registerProviders?(registry: ProviderRegistry): void;
}
```

### Capabilities

Declare what your plugin hooks into. When capabilities are declared, the framework warns if you use an API outside your declared set. Omitting capabilities disables enforcement (backwards compatible).

| Capability | APIs it covers |
|---|---|
| `"hooks"` | `addHook()` |
| `"interceptors"` | `addInterceptor()` |
| `"check-types"` | `registerCheckType()` |
| `"skills"` | `registerSkillSource()` |
| `"journal-consumers"` | `registerJournalConsumer()` |
| `"commands"` | `registerCommand()` |
| `"providers"` | `registerProviders()` hook |

## Plugin resolution

Plugins are resolved in this order:

1. **Project-local** -- `.converge/plugins/{name}/index.ts` (or `.js`)
2. **Built-in** -- compiled into `converge-core` (typescript, nextjs, git, docker, eslint, vitest, acp)
3. **Local file path** -- starts with `./`, `../`, or `/`
4. **npm package** -- `import(name)`

## Plugin API reference

The `PluginAPIV2` object is passed to `setup()`. All registration is done through it.

### Lifecycle hooks (fire-and-forget)

```typescript
api.addHook(event: HookEvent, fn: HookFn): void;
```

Hooks observe lifecycle events. They cannot modify behavior -- use interceptors for that.

**Available events (28 total):**

| Category | Events |
|---|---|
| Project | `project:start`, `project:complete`, `project:fail` |
| Task | `task:start`, `task:complete`, `task:fail`, `task:retry`, `task:skip` |
| Gap | `gap:detected`, `gap:resolved` |
| Convergence | `convergence:achieved`, `convergence:stalled` |
| Checkpoint | `checkpoint:created`, `checkpoint:restored` |
| Discovery | `discovery:found`, `discovery:changed` |
| Background | `background:started`, `background:degraded`, `background:recovered`, `background:crashed`, `background:stopped` |
| Sidecar | `sidecar:started`, `sidecar:stopped` |
| Schedule | `schedule:started`, `schedule:tick`, `schedule:stopped` |
| Lifecycle | `task:lifecycle-before`, `task:lifecycle-after`, `task:correction-attempt` |
| Cohort | `cohort:complete` |

Hook errors are caught and logged -- they never crash the workflow. Plugin hooks run after user hooks (priority 200 vs 100).

### Interceptors (middleware)

```typescript
api.addInterceptor(event: InterceptEvent, fn: InterceptorFn, priority?: number): void;
```

Interceptors wrap framework operations in a Koa-style middleware chain. Each interceptor calls `next()` to proceed or returns early to block/override.

```typescript
api.addInterceptor("intercept:task-execute", async (payload, next) => {
  // modify payload before execution
  const result = await next();
  // transform result after execution
  return { ...result, customField: true };
});
```

**Available intercept events:**

| Event | What it wraps |
|---|---|
| `intercept:task-execute` | Entire task execution -- modify taskDef or result |
| `intercept:check-evaluate` | Check evaluation -- custom check logic |
| `intercept:dag-compile` | DAG compilation -- inject nodes, validate structure |
| `intercept:skill-resolve` | Skill resolution -- custom skill sources |
| `intercept:error-classify` | Error classification -- transient vs structural |
| `intercept:retry-decide` | Retry decisions -- custom backoff, cost limits |

Interceptor errors are isolated -- a failing interceptor is skipped and the chain continues.

### Custom check types

```typescript
api.registerCheckType(type: string, evaluator: CheckTypeEvaluator): void;
```

Register a custom check evaluator for use in TASK.md `checks:` blocks:

```typescript
api.registerCheckType("http", async (check, ctx) => {
  const res = await fetch(check.cmd as string);
  return { passed: res.ok, output: `${res.status} ${res.statusText}` };
});
```

Then in TASK.md:

```yaml
checks:
  - id: api-health
    type: http
    cmd: https://api.example.com/health
```

Built-in types: `cmd` (shell command), `ai` (LLM judge), `test` (test reference).

### Skill sources

```typescript
api.registerSkillSource(source: SkillSource): void;
```

Add custom skill resolution beyond filesystem discovery:

```typescript
api.registerSkillSource({
  name: "remote-skills",
  async resolve(query) {
    const skills = await fetchSkillsFromAPI(query.taskId);
    return skills.map(s => ({
      name: s.name,
      description: s.description,
      path: s.path,
    }));
  },
});
```

### Journal consumers

```typescript
api.registerJournalConsumer(consumer: JournalConsumer): void;
```

Subscribe to the journal event stream for telemetry export:

```typescript
api.registerJournalConsumer({
  name: "datadog",
  async onEvent(event) {
    await datadogClient.sendMetric({
      name: `converge.${event.type}`,
      value: 1,
      tags: [`task:${event.taskId}`],
    });
  },
  async onFlush() {
    await datadogClient.flush();
  },
});
```

Consumer errors are caught per-consumer -- a failing consumer never blocks the journal.

### CLI commands

```typescript
api.registerCommand(cmd: PluginCommand): void;
```

Register custom CLI commands:

```typescript
api.registerCommand({
  name: "deploy",
  description: "Deploy the current playbook outputs",
  aliases: ["ship"],
  async handler({ positional, options }) {
    const target = positional[0] || "staging";
    console.log(`Deploying to ${target}...`);
  },
});
```

Usage: `converge deploy production`

### Provider registration

For provider plugins (acp, claude, etc.), use the `registerProviders` hook instead of `setup`:

```typescript
const myProvider: ConvergePluginV2 = {
  name: "my-provider",
  version: "1.0.0",
  capabilities: ["providers"],
  setup() {},
  registerProviders(registry) {
    registry.register("my-provider", async (opts) => {
      const sdk = await import("my-sdk");
      return sdk.createAgent(opts);
    });
  },
};
```

### Other APIs

```typescript
api.addTool(name, factory)       // custom tool in TaskContext.tools
api.addVars(vars)                // inject variables into all tasks
api.getVar(key)                  // read a var set by another plugin
api.hasPlugin(name)              // check if another plugin is loaded
api.registerCheck(check)         // register a check function (CheckFnMeta)
api.registerEval(evalFn)         // register an eval function
api.registerPlan(plan)           // register a plan function
api.registerTask(task)           // register a task function
```

## Plugin lifecycle

```
1. project.yaml parsed -> plugin entries extracted
2. Each plugin resolved (local -> builtin -> npm)
3. Validated (must have name, version, setup)
4. Topological sort (respects requires: dependencies)
5. For each plugin in order:
   a. PluginAPIImplV2 created
   b. plugin.setup(api) called
   c. plugin.registerProviders(registry) called if defined
   d. Manifest recorded
6. Plugin hooks bridged into HookRegistry
7. Plugin interceptors loaded into InterceptorRegistry
8. State passed to run pipeline
```

## CLI commands

```
converge plugin list              # show installed plugins and their contributions
converge plugin install <name>    # install a plugin (built-in or npm)
converge plugin uninstall <name>  # uninstall a plugin
```

## Built-in plugins

| Name | Description |
|---|---|
| `typescript` | TypeScript type checking |
| `nextjs` | Next.js project support |
| `git` | Git integration |
| `docker` | Docker support |
| `eslint` | ESLint checks |
| `vitest` | Vitest test runner |
| `acp` | Anthropic Client Protocol provider |

## Examples

### Monitoring plugin (hooks + check types + journal consumer)

```typescript
const monitoringPlugin: ConvergePluginV2 = {
  name: "monitoring",
  version: "1.0.0",
  capabilities: ["hooks", "check-types", "journal-consumers"],

  setup(api) {
    api.addHook("task:fail", async ({ ctx, error }) => {
      await sendSlackAlert(`Task ${ctx.taskId} failed: ${error.message}`);
    });

    api.registerCheckType("http", async (check, ctx) => {
      const res = await fetch(check.cmd as string);
      return { passed: res.ok, output: `${res.status}` };
    });

    api.registerJournalConsumer({
      name: "metrics",
      async onEvent(event) {
        metrics.increment(`converge.event.${event.type}`);
      },
    });
  },
};
```

### Cost-control plugin (interceptors)

```typescript
const costPlugin: ConvergePluginV2 = {
  name: "cost-control",
  version: "1.0.0",
  capabilities: ["interceptors"],

  setup(api) {
    api.addInterceptor("intercept:retry-decide", async (payload: any, next) => {
      if (payload.attempt >= 3) {
        return { ...payload, shouldRetry: false, reason: "cost-limit" };
      }
      return next();
    });

    api.addInterceptor("intercept:error-classify", async (payload: any, next) => {
      if (payload.error?.message?.includes("429")) {
        return { ...payload, classification: "transient" };
      }
      return next();
    });
  },
};
```

### DAG validator plugin (interceptors)

```typescript
const validatorPlugin: ConvergePluginV2 = {
  name: "dag-validator",
  version: "1.0.0",
  capabilities: ["interceptors"],

  setup(api) {
    api.addInterceptor("intercept:dag-compile", async (payload: any, next) => {
      const result = await next();
      // Validate all task IDs follow naming convention
      for (const [id] of result.dag.nodes || []) {
        if (!/^\d{2,3}-/.test(id)) {
          result.errors.push({
            message: `Task "${id}" doesn't match naming convention NN-name`,
            path: id,
          });
        }
      }
      return result;
    });
  },
};
```
