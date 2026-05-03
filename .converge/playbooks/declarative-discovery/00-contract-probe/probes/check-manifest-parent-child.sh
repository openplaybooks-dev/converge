#!/bin/bash
# Probe: cli-redesign — manifest types have parent_map/child_map
grep -q 'parent_map\|child_map' packages/core/src/manifest/types.ts
