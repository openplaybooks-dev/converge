# Attempt 1 Failed

**1** of **1** checks did not pass.

## What Failed

### no-harness-in-config
Command: `! grep -ri 'harness' --include='*.json' --include='*.yml' --include='*.yaml' packages/ 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v package-lock | head -1`
Exit code: 1
