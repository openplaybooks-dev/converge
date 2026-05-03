#!/bin/bash
# Probe: dbt-paradigm — seed-spawner exports spawnDynamicChildren or SeedSpawner
grep -q 'export.*spawnDynamicChildren\|export.*SeedSpawner' packages/core/src/runtime/seed-spawner.ts
