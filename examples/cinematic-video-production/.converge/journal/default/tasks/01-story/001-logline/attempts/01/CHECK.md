# Checks: 01-story/001-logline

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## logline-exists
**Description**: Logline file written and non-empty
**Command**: `test -s logline.md`

## logline-one-sentence
**Description**: Logline body is ~1 sentence (≤2 non-header lines)
**Command**: `node -e "const L=require('fs').readFileSync('logline.md','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#')).length;if(L>2){process.exit(1)}"`