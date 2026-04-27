# Checks: 08-reference/002-playbook-yml

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/reference/playbook-yml.md`

## documents-name-and-tasks
**Description**: documents name and tasks fields
**Command**: `grep -qE '^##\s+name|^###\s+name' docs/reference/playbook-yml.md && grep -qE '^##\s+tasks|^###\s+tasks' docs/reference/playbook-yml.md`

## documents-checks
**Description**: documents checks field
**Command**: `grep -qE '^##\s+checks|^###\s+checks' docs/reference/playbook-yml.md`

## shows-full-example
**Description**: shows a complete playbook.yml example
**Command**: `grep -qE '^name:.+\n.+description:' docs/reference/playbook-yml.md || grep -A20 '```yaml' docs/reference/playbook-yml.md | grep -q 'name:'`