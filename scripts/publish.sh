#!/bin/bash
set -e

# Publish script for @openplaybooks packages
# Handles dependency order and version checks automatically
# Requires npm logged in (run `npm login` first if not already)
# For accounts with 2FA: each publish will prompt for OTP interactively
# For automation tokens: set NPM_AUTH_TOKEN env var

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

  if [[ -n "${NPM_AUTH_TOKEN:-}" ]]; then
    npm publish --access public --otp="${NPM_AUTH_TOKEN}"
  else
    # No token — let npm prompt for OTP interactively
    # Use +e so we can catch the OTP error and give a helpful message
    set +e
    npm publish --access public
    local result=$?
    set -e
    if [[ $result -ne 0 ]]; then
      echo ""
      echo "❌ Publish failed (likely 2FA OTP issue)"
      echo "   To retry with OTP: NPM_AUTH_TOKEN=<code> npm publish --access public"
      echo "   Or run manually:   cd packages/$pkg && npm publish --access public"
      return 1
    fi
  fi
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

# Build all first — use topological order so agentfn's deps are ready first
echo "🔨 Building packages (topological order)..."
cd "$ROOT_DIR"
for pkg in acpfn claudefn codexfn deepcodefn geminifn kimifn openfn qwenfn; do
  echo "  building $pkg..."
  pnpm --filter "@openplaybooks/$pkg" build
done
echo "  building agentfn..."
pnpm --filter "@openplaybooks/agentfn" build
echo "  building converge..."
pnpm --filter "@openplaybooks/converge" build
echo ""

# Publish in dependency order (acpfn → agentfn → cli)
echo "=========================================="
echo "Publishing packages (dependency order)"
echo "=========================================="
echo ""
echo "⚠️  If 2FA is required, npm will prompt for a one-time password."
echo "⚠️  If you have an automation token, set NPM_AUTH_TOKEN env var to skip prompts."
echo ""

read -p "Press Enter to continue with publishing (or Ctrl+C to abort)..."

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