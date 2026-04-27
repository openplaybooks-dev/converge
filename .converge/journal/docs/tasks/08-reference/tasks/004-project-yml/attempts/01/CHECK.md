# Checks: 08-reference/004-project-yml

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/reference/project-yml.md`

## documents-ai-section
**Description**: documents the ai/providers section
**Command**: `grep -qiE 'ai|provider' docs/reference/project-yml.md`

## documents-name-description
**Description**: documents name and description fields
**Command**: `grep -qE '`name`|^###\s+name' docs/reference/project-yml.md && grep -qE '`description`|^###\s+description' docs/reference/project-yml.md`