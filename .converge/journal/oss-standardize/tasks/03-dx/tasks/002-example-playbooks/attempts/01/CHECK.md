# Checks: 03-dx/002-example-playbooks

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## hello-world-exists
**Description**: Hello world example exists
**Command**: `test -f examples/hello-world/.converge/playbooks/default/playbook.yml`

## data-pipeline-exists
**Description**: Data pipeline example exists
**Command**: `test -f examples/data-pipeline/.converge/playbooks/default/playbook.yml`

## fullstack-app-exists
**Description**: Fullstack app example exists
**Command**: `test -f examples/fullstack-app/.converge/playbooks/default/playbook.yml`