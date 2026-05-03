#!/bin/bash
# Probe: dbt-paradigm — no 'wbs' field in task-md-definition
! grep -q "'wbs'" packages/core/src/config/task-md-definition.ts 2>/dev/null
