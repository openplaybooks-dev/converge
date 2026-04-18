# Task: 01-brand/005-cli-rename

Update all CLI-facing text to use Converge branding.

**Scope**: `packages/core/src/cli/` — main.ts, commands.ts, and all command files

**Replacements**:
- Banner/ASCII art: replace any "HARNESS" banner with "CONVERGE"
- Help text descriptions
- Command examples in help output
- Error messages referencing "harness"
- `.harness/` directory references in user-facing output → `.converge/`

**Process**:
1. Read `packages/core/src/cli/main.ts` — find and update banner art
2. Read `packages/core/src/cli/commands.ts` — update all help descriptions
3. Scan all `commands-*.ts` files for harness references
4. Write manifest to `.converge/standardize-state/brand/005-cli.json`