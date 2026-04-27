# Checks: 04-getting-started/003-your-first-playbook

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/getting-started/your-first-playbook.md`

## shows-init
**Description**: walks through converge init
**Command**: `grep -qE 'converge\s+init' docs/getting-started/your-first-playbook.md`

## shows-run
**Description**: walks through converge run
**Command**: `grep -qE 'converge\s+run' docs/getting-started/your-first-playbook.md`

## shows-task-md
**Description**: shows the TASK.md file
**Command**: `grep -qE 'TASK\.md' docs/getting-started/your-first-playbook.md`

## shows-checks
**Description**: introduces the checks concept
**Command**: `grep -qE '^checks:|`checks:`|checks block' docs/getting-started/your-first-playbook.md`

## word-count-tight
**Description**: <=1200 words (target 5 min read)
**Command**: `wc -w docs/getting-started/your-first-playbook.md | awk '{exit ($1<=1200?0:1)}'`