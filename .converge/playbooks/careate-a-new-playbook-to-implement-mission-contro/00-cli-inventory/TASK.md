---
title: Inventory converge CLI commands
outputs:
  - cli-commands.json
checks:
  - id: manifest-exists
    cmd: test -s cli-commands.json
    description: cli-commands.json exists and is non-empty
  - id: manifest-valid-json
    cmd: node -e "JSON.parse(require('fs').readFileSync('cli-commands.json','utf8'))"
    description: cli-commands.json parses as valid JSON
  - id: manifest-shape
    cmd: 'node -e "const r=JSON.parse(require(''fs'').readFileSync(''cli-commands.json'',''utf8'')); if(!Array.isArray(r.commands)||r.commands.length<2) process.exit(1); for(const c of r.commands){if(!c.name||!c.description) process.exit(1)}"'
    description: manifest has a commands array of length >= 2 and every entry has name + description
  - id: manifest-sorted
    cmd: 'node -e "const r=JSON.parse(require(''fs'').readFileSync(''cli-commands.json'',''utf8'')); const names=r.commands.map(c=>c.name); const sorted=[...names].sort(); if(JSON.stringify(names)!==JSON.stringify(sorted)) process.exit(1)"'
    description: commands are sorted alphabetically by name for stable reruns
---

# Inventory converge CLI commands

**Goal**: Produce a structured manifest of every converge CLI command, its args, options, and one-line description, so downstream siblings can plan from data instead of guessing.

## Scope

Walk `packages/cli/src/` (entry point `packages/cli/src/main.ts`) and extract each registered command. Emit `cli-commands.json` with name, args, options/flags (with type/default/description), short description, and example invocations.

**Inputs**:
- `D:\converge\packages\cli\src\main.ts`
- `D:\converge\packages\cli\src\`

**Output**:
- `cli-commands.json` (written into this task's working directory)

**Output schema**:
```json
{
  "commands": [
    {
      "name": "string — subcommand name as invoked, e.g. \"plan\"",
      "args": [
        { "name": "string", "description": "string", "required": true, "variadic": false }
      ],
      "options": [
        {
          "name": "string — long flag without leading --, e.g. \"update\"",
          "short": "string|null — single-letter short flag without -",
          "type": "string — boolean | string | number | array | enum",
          "default": "any — JSON-serializable default value, or null",
          "description": "string"
        }
      ],
      "description": "string — one-line summary",
      "examples": ["string — sample invocations, optional"]
    }
  ]
}
```

## Instructions

1. **Discover the registration mechanism.** Use the `Read` tool on `D:\converge\packages\cli\src\main.ts` to determine how subcommands are registered (commander, yargs, custom dispatcher, or hand-rolled). Note the exact API used (e.g. `program.command(...)`, `yargs.command(...)`, switch on `argv[2]`). This dictates how to extract data in the next step.

2. **Walk every referenced command module.** Use `Glob` on `D:\converge\packages\cli\src\**/*.{ts,js}` to enumerate files, and `Grep` for the registration call discovered in step 1 (e.g. pattern `\.command\(` or `program\.command`) to locate every command definition. For each top-level command extract:
   - `name` — the subcommand string (e.g. `plan`, `run`, `journal`)
   - `args[]` — positional args; for each: `name`, `description`, `required` (true if non-optional in the signature), `variadic` (true if rest/spread)
   - `options[]` — flags; for each: `name` (long form, no leading `--`), `short` (or `null`), `type` (`boolean` for switches with no value, otherwise infer from default or option metadata), `default` (JSON-serializable, or `null`), `description`
   - `description` — the short description registered with the command
   - `examples[]` — optional, only include if found inline in the source

3. **Cross-check against `--help` if reachable.** From the converge repo root, attempt `node packages/cli/dist/main.js --help` (or the workspace's equivalent entry, e.g. `npx converge --help` / `pnpm --filter @converge/cli exec converge --help`) using `Bash`. If the binary runs, also invoke `--help` for each discovered subcommand and reconcile the extracted set against help output. Add any subcommands that appear in `--help` but were missed in the source walk; remove any that source-walk found but `--help` does not list. If no entry point is buildable, skip this step and rely on the source walk only — note this fact in a comment is not allowed (the manifest is data-only), but proceed.

4. **Sort and write.** Sort `commands` alphabetically by `name` (case-sensitive ASCII order is fine; the `manifest-sorted` check uses `Array.prototype.sort()` defaults). Use the `Write` tool to write the manifest to `cli-commands.json` in this task's working directory. Pretty-print with 2-space indent so the file is human-reviewable.

5. **Verify.** Run each check from the frontmatter manually before declaring done:
   - `test -s cli-commands.json`
   - `node -e "JSON.parse(require('fs').readFileSync('cli-commands.json','utf8'))"`
   - the `manifest-shape` and `manifest-sorted` commands

## Notes

- Every entry must have a non-empty `name` and `description` — these are the parity contract anchors used by `01-prd` and `05-command-views`. Empty `args` and `options` arrays are fine for commands that have none; do not omit the keys.
- If the CLI uses dynamic dispatch (e.g. registers commands inside a loop or via plugin discovery), prefer the `--help` cross-check as the source of truth over static analysis.
- Do not invent commands or options. If a flag's default or type cannot be determined from source or help output, set `default: null` and `type: "string"` rather than guessing.
