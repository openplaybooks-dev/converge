# Task: 03-dx/003-cli-help

Audit all CLI help text for accuracy, consistency, and completeness.

**Scope**: `packages/core/src/cli/` — main.ts, commands.ts, all commands-*.ts files

**Audit checklist**:
1. Every command has a description
2. All descriptions use "Converge" not "harness"
3. Example commands in help text are accurate and runnable
4. Flags and options are documented
5. Default values are mentioned where applicable
6. Help text is concise (< 3 lines per command)

**Process**:
1. Read `packages/core/src/cli/main.ts` — check banner, version display
2. Read `packages/core/src/cli/commands.ts` — check command registration
3. Read each `commands-*.ts` file — check help text
4. Document findings in audit report

**Write report** to `.converge/standardize-state/dx/cli-help-audit.json`:
```json
{
  "commands": [
    {
      "name": "run",
      "hasDescription": true,
      "brandCorrect": true,
      "examplesAccurate": true,
      "issues": []
    }
  ],
  "totalCommands": 10,
  "issuesFound": 0,
  "fixes": ["description of any fixes applied"]
}
```

Fix any issues found during the audit — don't just report them.