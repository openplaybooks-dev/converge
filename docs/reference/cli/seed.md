---
title: "converge seed"
description: "Materialize fixture inputs and spawn initial task structures."
sidebar:
  order: 20
---

Discover and run `.seed.md` files to materialize fixture inputs declared in `playbook.yml` and spawn child task structures. Mirrors `dbt seed`.

## Usage

```bash
converge seed [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--select=NAME` | (all) | Run only the named seed. |
| `--dry` | off | Print what would run without executing. |
| `--project-dir=PATH` | cwd | Project directory. |

## Where seeds live

Seed files are discovered under two patterns:

- `.converge/playbooks/*/seeds/**/*.seed.md` — playbook-level seeds
- `.converge/playbooks/*/tasks/**/seeds/**/*.seed.md` — task-level seeds

## Seed file format

Each `.seed.md` file has YAML frontmatter and a body:

```markdown
---
name: populate-tokens
description: Read tokens-catalog.json and spawn one child per token.
kind: nodejs
args:
  catalog:
    type: string
    default: assets/tokens-catalog.json
---

// Body: for kind=nodejs, this is evaluated as a function body.
// The seed receives a `ctx` object with projectDir, args, log, and spawn helpers.
const catalog = JSON.parse(
  require("fs").readFileSync(ctx.args.catalog, "utf-8")
);
for (const token of catalog.tokens) {
  ctx.spawn({ id: token.slug, vars: token });
}
ctx.log.info(`Spawned ${catalog.tokens.length} token tasks.`);
```

### Frontmatter fields

| Field | Required | Effect |
|---|---|---|
| `name` | Yes | Unique identifier for the seed. |
| `description` | No | Human-readable description. |
| `kind` | No (default: `nodejs`) | `nodejs` or `shell`. |
| `args` | No | Typed arguments for the seed, passed via `ctx.args`. |

### Kinds

| Kind | How it's executed |
|---|---|
| `nodejs` | Body is evaluated as a function body with access to a `ctx` object. Supports async. |
| `shell` | Body is executed as a shell script via `execSync` with a 30-second timeout. |

## Examples

```bash
# Run all seeds.
converge seed

# Preview what would run.
converge seed --dry

# Run a specific seed by name.
converge seed --select=populate-tokens
```

## When to use

- **First-run setup.** Run seeds before `converge run` to materialize fixture data that tasks depend on.
- **After a full refresh.** `converge build --full-refresh` wipes state; re-run seeds to repopulate fixtures.
- **CI bootstrap.** Add `converge seed` to CI steps before the build/test phase so fixtures are always present.

## Caveats

- Seeds run in the order they are discovered. If seed B depends on seed A's output, declare that dependency in your playbook or CI script.
- `nodejs` seeds use `new Function()` — don't run untrusted seed bodies.
- Shell seeds have a 30-second timeout. For longer seed operations, use `nodejs` kind.
