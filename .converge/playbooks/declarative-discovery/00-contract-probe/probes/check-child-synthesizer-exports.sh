#!/bin/bash
# Probe: dbt-paradigm — child-synthesizer exports synthesize
grep -q 'export.*function synthesize\|export.*synthesize' packages/core/src/runtime/child-synthesizer.ts
