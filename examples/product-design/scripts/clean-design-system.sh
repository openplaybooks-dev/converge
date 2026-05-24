#!/bin/bash
# Cleans all design-system playbook outputs

set -e

cd "$(dirname "$0")/.."

echo "Cleaning design-system outputs..."

# Remove design system outputs
rm -f .design/{DESIGN.md,BRAND.md,COLOR.md,TYPE.md,SPACING.md,COMPONENTS.md,LAYOUT.md,MOTION.md,tokens.css,index.html}
rm -rf .design/components .design/patterns

# Remove style references
rm -rf style-references

# Remove journal state
rm -rf .converge/journal

echo "Done."