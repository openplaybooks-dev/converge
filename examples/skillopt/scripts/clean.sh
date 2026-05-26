#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf .converge/journal .converge/artifacts .converge/inventory

if [ "${1:-}" = "--hard" ]; then
  rm -rf output vendor
fi
