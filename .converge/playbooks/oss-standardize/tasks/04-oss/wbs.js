/**
 * WBS: Open Source Readiness Pipeline
 *
 * Prepares repository for public release with community health
 * files, CI/CD, publishing config, and security audit.
 *
 *   001-community → 002-ci-cd → 003-npm-config → 004-changelog-process → 005-security
 */

export async function run(ctx) {
  // 1. Community health files
  await ctx.spawn({
    id: '001-community-health',
    title: 'Create community health files',
    outputs: [
      'CODE_OF_CONDUCT.md',
      '.github/ISSUE_TEMPLATE/bug_report.md',
      '.github/ISSUE_TEMPLATE/feature_request.md',
      '.github/PULL_REQUEST_TEMPLATE.md',
    ],
    checks: [
      {
        id: 'coc-exists',
        cmd: 'test -f CODE_OF_CONDUCT.md',
        description: 'Code of Conduct exists',
      },
      {
        id: 'issue-templates-exist',
        cmd: 'test -d .github/ISSUE_TEMPLATE',
        description: 'Issue templates directory exists',
      },
      {
        id: 'pr-template-exists',
        cmd: 'test -f .github/PULL_REQUEST_TEMPLATE.md',
        description: 'PR template exists',
      },
    ],
    body: `Create GitHub community health files.

**CODE_OF_CONDUCT.md**:
- Use Contributor Covenant v2.1 (standard)
- Update contact email/method for enforcement

**Issue templates** (\`.github/ISSUE_TEMPLATE/\`):

\`bug_report.md\`:
- Title, description, steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, converge version)
- Playbook snippet (if applicable)

\`feature_request.md\`:
- Problem statement
- Proposed solution
- Alternatives considered
- Use case / motivation

**PR template** (\`.github/PULL_REQUEST_TEMPLATE.md\`):
- Summary of changes
- Related issue(s)
- Type: bug fix / feature / docs / refactor
- Testing done
- Checklist: tests pass, docs updated, no breaking changes`,
  });

  // 2. GitHub Actions CI/CD
  await ctx.spawn({
    id: '002-ci-cd',
    title: 'Create GitHub Actions workflows',
    dependencies: ['001-community-health'],
    outputs: ['.github/workflows/ci.yml'],
    checks: [
      {
        id: 'ci-workflow-exists',
        cmd: 'test -f .github/workflows/ci.yml',
        description: 'CI workflow exists',
      },
      {
        id: 'ci-workflow-valid',
        cmd: "head -1 .github/workflows/ci.yml | grep -q 'name:'",
        description: 'CI workflow has valid YAML header',
      },
    ],
    body: `Create GitHub Actions CI/CD workflows.

**\`.github/workflows/ci.yml\`** — runs on every push and PR:

\`\`\`yaml
name: CI
on: [push, pull_request]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - Checkout
      - Setup Node.js
      - Install dependencies
      - Lint
      - Build (all packages)
      - Test (all packages)
      - Type check
\`\`\`

**Considerations**:
- Use monorepo-aware build (check if turbo, nx, or npm workspaces)
- Cache node_modules for speed
- Run tests with coverage reporting
- Fail fast on lint errors
- Read \`package.json\` to understand the actual build/test commands`,
  });

  // 3. npm publish config
  await ctx.spawn({
    id: '003-npm-config',
    title: 'Audit npm publish configuration',
    dependencies: ['001-community-health'],
    outputs: ['.converge/artifacts/oss/npm-audit.md'],
    checks: [
      {
        id: 'npm-audit-exists',
        cmd: 'test -f .converge/artifacts/oss/npm-audit.md',
        description: 'npm audit report exists',
      },
    ],
    body: `Audit all package.json files for npm publishing readiness.

**For each package** in the monorepo, verify:
1. \`name\` — uses correct scope and naming (no "harness" references)
2. \`version\` — semantic versioning, appropriate for first public release
3. \`description\` — accurate, mentions Converge
4. \`license\` — "Apache-2.0"
5. \`repository\` — correct GitHub URL
6. \`homepage\` — set (or will be set)
7. \`keywords\` — relevant search terms
8. \`files\` or \`.npmignore\` — only published files included (no tests, no docs, no .converge/)
9. \`main\`, \`types\`, \`exports\` — correct entry points
10. \`engines\` — minimum Node.js version specified
11. \`publishConfig\` — access: public (for scoped packages)

**Write report** using \`ctx.artifact.set('oss/npm-audit', JSON.stringify(report, null, 2))\`:
\`\`\`json
{
  "packages": [
    {
      "name": "@openplaybooks/converge-core",
      "path": "packages/core",
      "ready": true,
      "issues": []
    }
  ],
  "fixes": ["description of fixes applied"]
}
\`\`\`

Fix any issues found — don't just report them.`,
  });

  // 4. Changelog process
  await ctx.spawn({
    id: '004-changelog-process',
    title: 'Document changelog and release process',
    dependencies: ['003-npm-config'],
    outputs: ['docs/releasing.md'],
    checks: [
      {
        id: 'releasing-doc-exists',
        cmd: 'test -f docs/releasing.md',
        description: 'Releasing documentation exists',
      },
    ],
    body: `Document the release and changelog process.

**Create** \`docs/releasing.md\` with:

1. **Versioning** — semver policy, what constitutes major/minor/patch
2. **Changelog maintenance** — how to update CHANGELOG.md
   - Keep a Changelog format
   - Update with each PR (not just at release time)
   - Categories: Added, Changed, Deprecated, Removed, Fixed, Security
3. **Release checklist**:
   - All tests pass
   - CHANGELOG.md updated
   - Version bumped in package.json
   - Build succeeds
   - npm publish from CI (not local)
4. **Pre-release versions** — alpha, beta, rc naming
5. **Monorepo considerations** — independent vs synchronized versioning`,
  });

  // 5. Security scan
  await ctx.spawn({
    id: '005-security-scan',
    title: 'Pre-release security scan',
    dependencies: ['003-npm-config'],
    outputs: ['.converge/artifacts/oss/security-scan.md'],
    checks: [
      {
        id: 'security-scan-exists',
        cmd: 'test -f .converge/artifacts/oss/security-scan.md',
        description: 'Security scan report exists',
      },
    ],
    body: `Run a pre-release security audit.

**Checks**:
1. \`npm audit\` — check for known vulnerabilities in dependencies
2. **No secrets in code** — grep for API keys, tokens, passwords:
   \`\`\`bash
   grep -ri 'sk-\\|api_key\\|secret\\|password\\|token' --include='*.ts' --include='*.js' packages/ | grep -v node_modules | grep -v test | grep -v '.d.ts'
   \`\`\`
3. **No .env files committed** — check git history
4. **SECURITY.md** — verify it has responsible disclosure instructions
5. **License compliance** — verify all dependencies have compatible licenses

**Write report** using \`ctx.artifact.set('oss/security-scan', JSON.stringify(report, null, 2))\`:
\`\`\`json
{
  "npmAudit": { "vulnerabilities": 0, "details": [] },
  "secretsScan": { "found": 0, "details": [] },
  "envFiles": { "committed": false },
  "securityMd": { "exists": true, "hasDisclosure": true },
  "licenseCompliance": { "compatible": true, "issues": [] }
}
\`\`\`

Fix any critical or high-severity issues found.`,
  });
}
