#!/usr/bin/env bash
# Build every workspace package under packages/ that defines a "build" script.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

exec pnpm --filter './packages/*' build "$@"
