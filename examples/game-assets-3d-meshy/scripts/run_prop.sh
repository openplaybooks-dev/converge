#!/usr/bin/env bash
# Sequenced prop pipeline: ref → preview → refine. Stops on first error.
set -euo pipefail
id="${1:?usage: run_prop.sh <id>}"
node scripts/build_prop_ref.js "$id"
node scripts/meshy_step.js "$id" preview
node scripts/meshy_step.js "$id" refine
