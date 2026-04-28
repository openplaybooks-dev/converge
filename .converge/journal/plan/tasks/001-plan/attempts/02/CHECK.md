# Checks: 001-plan

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## playbook-yml-exists
**Description**: playbook.yml created
**Command**: `test -f .converge/playbooks/careate-a-new-playbook-to-implement-mission-contro/playbook.yml`

## has-tasks-dir
**Description**: Tasks directory created
**Command**: `test -d .converge/playbooks/careate-a-new-playbook-to-implement-mission-contro/tasks`

## has-task-files
**Description**: At least 2 TASK.md files generated
**Command**: `test $(find .converge/playbooks/careate-a-new-playbook-to-implement-mission-contro/tasks -name "TASK.md" 2>/dev/null | wc -l) -ge 2`