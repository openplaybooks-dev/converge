#!/bin/bash
# Quick script to rebuild crew CLI

set -e

echo "🔨 Building crew dependencies..."
cd "$(dirname "$0")"

# Build provider packages
echo "  → Building provider packages..."
(cd packages/claudefn && pnpm run build) &
(cd packages/geminifn && pnpm run build) &
(cd packages/kimifn && pnpm run build) &
(cd packages/qwenfn && pnpm run build) &
wait

# Build agentfn
echo "  → Building agentfn..."
(cd packages/agentfn && pnpm run build)

# Build crew
echo "  → Building crew CLI..."
(cd packages/crew && pnpm run build)

echo "✅ Crew CLI built successfully!"
echo ""
echo "Run 'crew --help' to verify installation"
