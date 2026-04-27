# Checks: 04-ui/024-no-mc-api-routes

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## api-allowlist-only
**Description**: src/app/api/ contains only converge-native top-level dirs
**Command**: `bash -c 'cd packages/converge-studio/src/app/api && allowed="playbooks runs run watch events"; for d in */; do d=${d%/}; case " $allowed " in *" $d "*) ;; *) echo "unexpected: $d"; exit 1 ;; esac; done'`

## api-required-present
**Description**: All required converge-native API dirs are present
**Command**: `test -d packages/converge-studio/src/app/api/playbooks && test -d packages/converge-studio/src/app/api/runs && test -d packages/converge-studio/src/app/api/run && test -d packages/converge-studio/src/app/api/watch && test -d packages/converge-studio/src/app/api/events`

## nodejs-runtime-on-all-routes
**Description**: Every route.ts under src/app/api/ declares runtime = 'nodejs'
**Command**: `bash -c 'count=$(find packages/converge-studio/src/app/api -name route.ts | wc -l | tr -d " "); ok=$(grep -l "runtime = .nodejs." $(find packages/converge-studio/src/app/api -name route.ts) 2>/dev/null | wc -l | tr -d " "); test "$count" = "$ok"'`