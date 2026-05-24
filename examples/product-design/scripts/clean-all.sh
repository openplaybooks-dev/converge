#!/bin/bash
# Cleans all playbook outputs and runtime state

set -e

cd "$(dirname "$0")/.."

echo "Cleaning all outputs..."

# Remove all design outputs
rm -rf docs/product .design style-references

# Remove journal and runtime state
rm -rf .converge/journal .converge/state

echo "Done."