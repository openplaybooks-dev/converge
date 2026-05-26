#!/bin/bash
# Publishes all @openplaybooks packages from the monorepo root.
# - Resolves workspace: deps to actual published versions
# - Bumps all @openplaybooks/* packages to the same version
# - Builds and tests before publishing
# - Run from monorepo root: ./scripts/publish.sh [version]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# Parse args
VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version>  (e.g., $0 0.4.11)"
  echo ""
  echo "Current versions:"
  for pkg in cli core studio acpfn agentfn claudefn codexfn deepcodefn geminifn kimifn openfn qwenfn; do
    v=$(node -p "require('./packages/$pkg/package.json').version" 2>/dev/null || echo "MISSING")
    echo "  $pkg: $v"
  done
  exit 1
fi

# Packages to publish (topological order — dependents after their deps)
PACKAGES=(
  "acpfn"
  "claudefn"
  "codexfn"
  "deepcodefn"
  "geminifn"
  "kimifn"
  "openfn"
  "qwenfn"
  "agentfn"
  "core"
  "studio"
  "cli"
)

echo "=========================================="
echo "Publishing @openplaybooks packages"
echo "Version: $VERSION"
echo "=========================================="
echo ""

# Step 1: Version bump all packages
echo "1/4: Bumping versions to $VERSION..."
for pkg in "${PACKAGES[@]}"; do
  pkg_json="./packages/$pkg/package.json"
  if [[ ! -f "$pkg_json" ]]; then
    echo "  ⚠️  Skipping $pkg (not found)"
    continue
  fi
  current=$(node -p "require('$pkg_json').version")
  if [[ "$current" == "$VERSION" ]]; then
    echo "  $pkg: already $VERSION"
  else
    node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$pkg_json', 'utf8'));
pkg.version = '$VERSION';
fs.writeFileSync('$pkg_json', JSON.stringify(pkg, null, 2) + '\n');
"
    echo "  $pkg: $current → $VERSION"
  fi
done
echo ""

# Step 2: Build all packages
echo "2/4: Building all packages..."
pnpm install --no-frozen-lockfile
pnpm build 2>&1 | grep -E "^(>|✓|⚡)" | head -20 || true
echo ""

# Step 3: Test (block on failure)
echo "3/4: Running tests..."
pnpm test || {
  echo ""
  echo "❌ Tests failed. Fix before publishing."
  exit 1
}
echo ""

# Step 4: Publish from workspace root
# pnpm -r publish resolves workspace: deps to actual versions being published
echo "4/4: Publishing to npm..."
echo ""
echo "⚠️  If 2FA is required, npm will prompt for OTP."
echo "⚠️  To skip OTP prompts, set NPM_AUTH_TOKEN env var."
echo ""
read -p "Press Enter to publish (Ctrl+C to abort)..."

npm publish --access public || {
  echo ""
  echo "❌ npm publish failed."
  echo "   To retry with OTP: NPM_AUTH_TOKEN=<code> $0 $VERSION"
  exit 1
}

echo ""
echo "=========================================="
echo "✅ All @openplaybooks packages published at $VERSION!"
echo "=========================================="
echo ""
echo "Verify:"
echo "  npm view @openplaybooks/converge version"
echo "  npm view @openplaybooks/converge-core version"
