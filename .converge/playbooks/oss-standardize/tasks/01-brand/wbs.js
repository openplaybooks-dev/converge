/**
 * WBS: Brand Consolidation Pipeline
 *
 * Renames all harness/crew/sheetsrun references to converge.
 * Sequential pipeline — each phase must complete before the next
 * to avoid file conflicts during renames.
 *
 *   001-source → 002-docs → 003-config → 004-license → 005-cli → 006-audit
 */

export async function run(ctx) {
  // Phase 1: Source files (.ts)
  await ctx.spawn({
    id: '001-source-rename',
    title: 'Rename harness→converge in TypeScript source',
    outputs: ['.converge/artifacts/brand/001-source.md'],
    checks: [
      {
        id: 'no-harness-in-ts',
        cmd: "test -z \"$(grep -ri 'harness' --include='*.ts' packages/core/src/ packages/agentfn/src/ packages/claudefn/src/ packages/acpfn/src/ packages/codets/src/ 2>/dev/null | grep -v node_modules | grep -v auto-verify | grep -v '.converge/')\"",
        description: 'No harness references in .ts source files',
      },
      {
        id: 'no-crew-in-ts',
        cmd: "test -z \"$(grep -ri 'crew\\|crewadd\\|sheetsrun' --include='*.ts' packages/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')\"",
        description: 'No crew/crewadd/sheetsrun references in .ts source files',
      },
    ],
    body: `Find and replace all stale brand references in TypeScript source files.

**Scope**: All \`.ts\` files under \`packages/*/src/\`

**Replacements** (case-preserving):
- \`harness\` → \`converge\` (when used as product/framework name)
- \`Harness\` → \`Converge\`
- \`HARNESS\` → \`CONVERGE\`
- \`HarnessClient\` → \`ConvergeClient\`
- \`harness-client\` → \`converge-client\`
- \`crew\` → appropriate converge equivalent (context-dependent)
- \`crewadd\` → remove or replace
- \`sheetsrun\` → remove or replace

**Exceptions** — do NOT rename:
- \`auto-verify\` directory (internal module, formerly \`harness/\`)
- Third-party references (e.g., \`test-harness\` patterns)
- Git history references in comments

**Process**:
1. Run \`grep -ri 'harness\\|crew\\|sheetsrun' --include='*.ts' packages/\` to find all occurrences
2. Review each match for context — is it a product name or a generic word?
3. Apply replacements file by file
4. Write a manifest using \`ctx.artifact.set('brand/001-source', JSON.stringify({
  "filesModified": ["path/to/file.ts"],
  "replacements": 42,
  "skipped": ["path/to/exception.ts — reason"]
}, null, 2))\``,
  });

  // Phase 2: Documentation (.md)
  await ctx.spawn({
    id: '002-docs-rename',
    title: 'Rename harness→converge in documentation',
    dependencies: ['001-source-rename'],
    outputs: ['.converge/artifacts/brand/002-docs.md'],
    checks: [
      {
        id: 'no-harness-in-md',
        cmd: "test -z \"$(grep -ri 'harness' --include='*.md' packages/ docs/ README.md CONTRIBUTING.md 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v auto-verify)\"",
        description: 'No harness references in .md documentation files',
      },
    ],
    body: `Find and replace all stale brand references in Markdown documentation.

**Scope**: All \`.md\` files under \`packages/\`, \`docs/\`, root \`README.md\`, \`CONTRIBUTING.md\`

**Replacements** (case-preserving):
- \`harness\` → \`converge\` (product name context)
- \`Harness\` → \`Converge\`
- \`HARNESS\` → \`CONVERGE\`
- \`.harness/\` → \`.converge/\` (directory references)
- \`harness run\` → \`converge run\` (CLI commands)
- \`harness-planning\` → \`converge-planning\`
- \`harness-control\` → \`converge-control\`
- ASCII art banners containing "HARNESS" → replace with "CONVERGE"
- \`crew\`/\`crewadd\`/\`sheetsrun\` → remove or replace contextually

**Exceptions** — do NOT rename:
- CHANGELOG entries documenting the rename itself
- Files inside \`.converge/\` playbook directories
- \`auto-verify\` references (internal module name)

**Process**:
1. Run grep to find all occurrences
2. Review and replace contextually
3. Pay special attention to README.md ASCII art banner
4. Write manifest using \`ctx.artifact.set('brand/002-docs', JSON.stringify({...}, null, 2))\``,
  });

  // Phase 3: Config files (.json, .yml)
  await ctx.spawn({
    id: '003-config-rename',
    title: 'Rename harness→converge in config files',
    dependencies: ['002-docs-rename'],
    outputs: ['.converge/artifacts/brand/003-config.md'],
    checks: [
      {
        id: 'no-harness-in-config',
        cmd: "test -z \"$(grep -ri 'harness' --include='*.json' --include='*.yml' --include='*.yaml' packages/ 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v package-lock)\"",
        description: 'No harness references in config files',
      },
    ],
    body: `Find and replace all stale brand references in config files.

**Scope**: All \`.json\`, \`.yml\`, \`.yaml\` files under \`packages/\`

**Replacements**:
- Package names: \`@openplaybooks/harness\` → \`@openplaybooks/converge-core\` (or similar)
- Script names: \`build-crew\` → \`build-converge\`
- Binary names in package.json \`bin\` fields
- Description fields mentioning "harness"
- Repository URLs if they reference old names

**Process**:
1. Run grep to find all occurrences in config files
2. Be careful with JSON — maintain valid syntax
3. Update package.json name, description, bin, scripts fields
4. Update any playbook.yml files outside \`.converge/\`
5. Write manifest using \`ctx.artifact.set('brand/003-config', JSON.stringify({...}, null, 2))\``,
  });

  // Phase 4: License & Security
  await ctx.spawn({
    id: '004-license-security',
    title: 'Update license and security files',
    dependencies: ['003-config-rename'],
    outputs: ['.converge/artifacts/brand/004-license.md'],
    checks: [
      {
        id: 'no-harness-in-legal',
        cmd: "test -z \"$(grep -i 'harness' SECURITY.md LICENSE 2>/dev/null | grep -v '.converge/')\"",
        description: 'No harness references in legal files',
      },
    ],
    body: `Update SECURITY.md and LICENSE files to use Converge branding.

**Scope**: Root \`SECURITY.md\`, \`LICENSE\`, any \`LICENSE\` files in packages

**Replacements**:
- Project name references: harness → Converge
- Repository URLs
- Contact information if it references old project name
- Copyright holder name if applicable

**Process**:
1. Read SECURITY.md — update project name and any CLI references
2. Read LICENSE — update if it mentions harness by name
3. Check for per-package LICENSE files
4. Write manifest using \`ctx.artifact.set('brand/004-license', JSON.stringify({...}, null, 2))\``,
  });

  // Phase 5: CLI references
  await ctx.spawn({
    id: '005-cli-rename',
    title: 'Update CLI help text and banner',
    dependencies: ['004-license-security'],
    outputs: ['.converge/artifacts/brand/005-cli.md'],
    checks: [
      {
        id: 'no-harness-in-cli',
        cmd: "test -z \"$(grep -i 'harness' packages/core/src/cli/*.ts 2>/dev/null | grep -v auto-verify | grep -v '.converge/')\"",
        description: 'No harness references in CLI source',
      },
    ],
    body: `Update all CLI-facing text to use Converge branding.

**Scope**: \`packages/core/src/cli/\` — main.ts, commands.ts, and all command files

**Replacements**:
- Banner/ASCII art: replace any "HARNESS" banner with "CONVERGE"
- Help text descriptions
- Command examples in help output
- Error messages referencing "harness"
- \`.harness/\` directory references in user-facing output → \`.converge/\`

**Process**:
1. Read \`packages/core/src/cli/main.ts\` — find and update banner art
2. Read \`packages/core/src/cli/commands.ts\` — update all help descriptions
3. Scan all \`commands-*.ts\` files for harness references
4. Write manifest using \`ctx.artifact.set('brand/005-cli', JSON.stringify({...}, null, 2))\``,
  });

  // Phase 6: Final verification audit
  await ctx.spawn({
    id: '006-verification-audit',
    title: 'Final brand verification audit',
    dependencies: ['005-cli-rename'],
    outputs: ['.converge/artifacts/brand/006-audit.md'],
    checks: [
      {
        id: 'audit-clean',
        cmd: `node -e "const a=JSON.parse(require('fs').readFileSync('.converge/artifacts/brand/006-audit.md','utf-8'));if(a.staleReferences>0)throw new Error(a.staleReferences+' stale refs remain')"`,
        description: 'Audit confirms zero stale references',
      },
    ],
    body: `Run a comprehensive grep audit across the entire codebase to verify
zero stale brand references remain.

**Full scan**:
\`\`\`bash
# Scan everything (excluding node_modules, .git, CHANGELOG, .converge/, auto-verify)
grep -ri 'harness' --include='*.ts' --include='*.md' --include='*.json' --include='*.yml' --include='*.yaml' . | grep -v node_modules | grep -v '.git/' | grep -v CHANGELOG | grep -v '.converge/' | grep -v auto-verify
grep -ri 'crew\\|crewadd\\|sheetsrun' --include='*.ts' --include='*.md' --include='*.json' . | grep -v node_modules | grep -v '.git/' | grep -v CHANGELOG | grep -v '.converge/'
\`\`\`

**Write audit report** using \`ctx.artifact.set('brand/006-audit', JSON.stringify(report, null, 2))\`:
\`\`\`json
{
  "timestamp": "ISO-8601",
  "staleReferences": 0,
  "scannedFiles": 500,
  "patterns": ["harness", "crew", "crewadd", "sheetsrun"],
  "exceptions": [
    { "file": "path", "reason": "auto-verify internal module" }
  ],
  "remaining": []
}
\`\`\`

If any stale references are found, fix them before writing the audit report.
The audit must report \`staleReferences: 0\` to pass.`,
  });
}
