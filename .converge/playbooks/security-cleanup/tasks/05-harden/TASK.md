---
title: Harden Repository with Safeguards
dependencies:
  - clean
outputs:
  - .git/hooks/pre-commit
  - .github/workflows/secret-scan.yml
  - .gitattributes
checks:
  - id: precommit-hook-exists
    cmd: test -f .git/hooks/pre-commit && test -x .git/hooks/pre-commit
    description: Pre-commit hook is installed and executable
  - id: precommit-detects-test-secret
    cmd: |
      echo 'TEST_API_KEY=sk-fake-test-key-1234567890abcdef' > /tmp/.test-secret-file &&
      bash .git/hooks/pre-commit /tmp/.test-secret-file 2>&1 | grep -qi 'secret\|blocked\|prevent' ||
      (rm -f /tmp/.test-secret-file && echo 'Hook does not detect test secrets' && exit 1)
      rm -f /tmp/.test-secret-file
    description: Pre-commit hook actually detects secrets
  - id: ci-workflow-exists
    cmd: test -f .github/workflows/secret-scan.yml
    description: GitHub Actions secret scanning workflow exists
  - id: ci-workflow-valid-yaml
    cmd: |
      node -e "
      const yaml = require('fs').readFileSync('.github/workflows/secret-scan.yml','utf-8');
      // Basic YAML validation — check it has expected keys
      if (!yaml.includes('name:') || !yaml.includes('on:') || !yaml.includes('jobs:')) {
        throw new Error('CI workflow appears malformed');
      }
      console.log('CI workflow looks valid');
      "
    description: CI workflow contains required YAML sections
---

Add safeguards to prevent future secret leaks.

### 1. Pre-commit Hook

Install the pre-commit hook from `templates/pre-commit-hook.sh`:

```bash
cp .converge/playbooks/security-cleanup/tasks/05-harden/templates/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

The hook scans staged files for common secret patterns (`sk-`, `AIza`, `xai-`,
`msy_`, `sk-proj-`, `sk-api-`, `sk-cp-`, `BEGIN PRIVATE KEY`) and blocks the
commit if any are found.

### 2. GitHub Actions CI Secret Scanner

Install the CI workflow:

```bash
mkdir -p .github/workflows
cp .converge/playbooks/security-cleanup/tasks/05-harden/templates/secret-scan.yml .github/workflows/secret-scan.yml
```

This workflow runs on every push and PR, scanning for:
- API keys and secrets (using gitleaks or grep-based detection)
- Large files (>1MB) committed accidentally
- Tracked `.env` files

### 3. `.gitattributes` for Large Files

If brand assets need to be kept, set up Git LFS:

```bash
# Only if large design assets must stay in the repo
echo 'assets/brand/explorations/* filter=lfs diff=lfs merge=lfs -text' >> .gitattributes
```

### 4. Verify

After installation, test the pre-commit hook:

```bash
echo 'TEST_API_KEY=sk-fake-test-123456' > /tmp/test-secret
git add /tmp/test-secret 2>/dev/null || true
.git/hooks/pre-commit
# Should exit non-zero and print a warning message
```
