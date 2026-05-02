#!/bin/bash
# Probe: dbt-paradigm — wbs-executor is gone
! test -f packages/core/src/executor/wbs-executor.ts
