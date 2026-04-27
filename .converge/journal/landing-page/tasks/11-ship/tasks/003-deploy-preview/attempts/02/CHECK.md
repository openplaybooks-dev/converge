# Checks: 11-ship/003-deploy-preview

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## preview-deployed
**Description**: preview deploy succeeded and URL is captured
**Command**: `test -f apps/landing/.preview-deploy-url && grep -qE 'pages\.dev|workers\.dev' apps/landing/.preview-deploy-url`