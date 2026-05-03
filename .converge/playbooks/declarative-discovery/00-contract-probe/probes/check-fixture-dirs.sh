#!/bin/bash
# Probe: cli-redesign — fixture has seeds/ and tests/ directories
test -d packages/cli/tests/fixtures/minimal-playbook/seeds || { echo "FAIL: fixture missing seeds/"; exit 1; }
test -d packages/cli/tests/fixtures/minimal-playbook/tests || { echo "FAIL: fixture missing tests/"; exit 1; }
