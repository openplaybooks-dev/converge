# Checks: 06-guides/004-build-a-software-project

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/guides/build-a-software-project.md`

## page-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/guides/build-a-software-project.md | grep -q '^title:' && head -10 docs/guides/build-a-software-project.md | grep -q '^sources:'`

## anchored-on-software-examples
**Description**: page anchors on a real software example
**Command**: `grep -qE 'flutter-app|fullstack-app|stitch-to-flutter' docs/guides/build-a-software-project.md`

## shows-playbook-yml
**Description**: shows a playbook.yml shape
**Command**: `grep -qE 'playbook\.yml|^\s*name:' docs/guides/build-a-software-project.md`

## shows-task-md
**Description**: covers TASK.md
**Command**: `grep -qE 'TASK\.md' docs/guides/build-a-software-project.md`

## word-count-ok
**Description**: 800-1800 words
**Command**: `test -f docs/guides/build-a-software-project.md && wc -w docs/guides/build-a-software-project.md | awk '{exit ($1>=800&&$1<=1800?0:1)}'`