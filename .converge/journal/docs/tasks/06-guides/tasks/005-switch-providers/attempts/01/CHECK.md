# Checks: 06-guides/005-switch-providers

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/guides/switch-providers.md`

## page-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/guides/switch-providers.md | grep -q '^title:' && head -10 docs/guides/switch-providers.md | grep -q '^sources:'`

## covers-claude-and-others
**Description**: covers Claude + at least one other provider
**Command**: `grep -qiE 'claude' docs/guides/switch-providers.md && grep -qiE 'gemini|kimi|qwen|openrouter' docs/guides/switch-providers.md`

## shows-project-yml
**Description**: shows project.yml provider config
**Command**: `grep -qE 'project\.yml|^ai:' docs/guides/switch-providers.md`

## word-count-ok
**Description**: 600-1500 words
**Command**: `wc -w docs/guides/switch-providers.md | awk '{exit ($1>=600&&$1<=1500?0:1)}'`