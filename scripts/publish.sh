#!/bin/bash
set -e

# Publish script for @openplaybooks packages
# Handles dependency order and version checks automatically
# Usage: ./scripts/publish.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

publish_pkg() {
  local pkg="$1"
  local dir="$ROOT_DIR/packages/$pkg"
  if [[ ! -d "$dir" ]]; then
    echo "⚠️  Package directory not found: $dir"
    return 1
  fi

  echo ""
  echo "📦 Publishing $pkg..."
  cd "$dir"
  # No --otp flag — 2FA will be prompted interactively in terminal
  npm publish --access public
}

echo "=========================================="
echo "Publishing @openplaybooks packages"
echo "=========================================="
echo ""

# Version summary
echo "Versions:"
echo "  acpfn:      $(node -p "require('./packages/acpfn/package.json').version")"
echo "  agentfn:    $(node -p "require('./packages/agentfn/package.json').version")"
echo "  converge:   $(node -p "require('./packages/cli/package.json').version")"
echo ""

# Build all first
echo "🔨 Building all packages..."
./scripts/build-packages.sh
echo ""

# Publish in dependency order (acpfn → agentfn → cli)
echo "=========================================="
echo "Publishing packages (dependency order)"
echo "=========================================="

publish_pkg "acpfn"
echo "✅ acpfn published"

publish_pkg "agentfn"
echo "✅ agentfn published"

publish_pkg "cli"
echo "✅ converge (cli) published"

echo ""
echo "=========================================="
echo "✅ All packages published successfully!"
echo "=========================================="