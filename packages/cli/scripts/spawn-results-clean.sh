#!/usr/bin/env bash
# RFC 0021 — exits 0 iff every row in $1/spawn.plan.result.jsonl has "ok":true.
#
# Use this as a parent task's post-body check:
#   checks:
#     - id: spawn-clean
#       cmd: bash scripts/spawn-results-clean.sh
#
# When any row failed, the script exits 1 — the converge prompt then sees
# the failing rows in spawn.plan.result.jsonl and patches spawn.plan.jsonl.

set -euo pipefail

DIR="${1:-${CONVERGE_TASK_DIR:-}}"
if [ -z "${DIR}" ]; then
  echo "spawn-results-clean: pass a dir or set CONVERGE_TASK_DIR" >&2
  exit 1
fi

RESULT="${DIR%/}/spawn.plan.result.jsonl"
if [ ! -f "${RESULT}" ]; then
  echo "spawn-results-clean: no result file at ${RESULT}" >&2
  exit 1
fi

# Any "ok":false row → fail.
if grep -q '"ok":false' "${RESULT}"; then
  exit 1
fi
exit 0
