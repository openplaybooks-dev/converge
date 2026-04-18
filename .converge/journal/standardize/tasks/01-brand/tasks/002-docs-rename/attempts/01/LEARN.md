# Attempt 1 Failed

**1** of **1** checks did not pass.

## What Failed

### no-harness-in-md
Command: `! grep -ri 'harness' --include='*.md' packages/ docs/ README.md CONTRIBUTING.md 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v auto-verify | head -1`
Exit code: 1
