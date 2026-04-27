# Checks: 04-drop-mc-only/004-drop-domain-api

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## only-allowlist-remains
**Description**: src/app/api/ contains only converge-native dirs
**Command**: `bash -c 'cd packages/studio/src/app/api && allowed="playbooks runs run watch events search settings"; for d in */; do d=${d%/}; case " $allowed " in *" $d "*) ;; *) echo "unexpected: $d"; exit 1 ;; esac; done'`

## marker-written
**Description**: A marker file recording the drop is written
**Command**: `test -f .converge/studio-state/dropped-domain-api.txt`