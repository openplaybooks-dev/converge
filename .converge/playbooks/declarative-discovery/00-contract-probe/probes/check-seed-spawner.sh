#!/bin/bash
# Probe: dbt-paradigm — seed-spawner exists
test -f packages/core/src/runtime/seed-spawner.ts
