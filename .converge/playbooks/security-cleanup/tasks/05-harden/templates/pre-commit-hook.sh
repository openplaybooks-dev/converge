#!/usr/bin/env bash
# Pre-commit hook: scan staged files for secrets and API keys.
# Blocks the commit if any are found.
#
# Installed by: security-cleanup playbook, phase 05-harden
# Location: .git/hooks/pre-commit

set -euo pipefail

# Patterns that indicate secrets (extend as needed)
PATTERNS=(
  'sk-[A-Za-z0-9_-]{20,}'           # Generic sk- prefix keys
  'AIza[A-Za-z0-9_-]{30,}'           # Google/Gemini API keys
  'xai-[A-Za-z0-9_-]{30,}'           # xAI/Grok API keys
  'msy_[A-Za-z0-9_-]{20,}'           # Meshy API keys
  'sk-proj-[A-Za-z0-9_-]{50,}'       # OpenAI project keys
  'sk-api-[A-Za-z0-9_-]{50,}'        # Anthropic API keys
  'sk-cp-[A-Za-z0-9_-]{50,}'         # MiniMax API keys
  'BEGIN\s+(RSA|OPENSSH|EC)\s+PRIVATE\s+KEY'  # Private keys
  'AFDhg[A-Za-z0-9]{15,}'            # Kling access key pattern
  'YmF8e[A-Za-z0-9]{15,}'            # Kling secret key pattern
)

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get list of staged files (only Added, Copied, or Modified)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || echo "")

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

FOUND_SECRET=0
SECRET_FILES=""

for file in $STAGED_FILES; do
  # Skip binary files, node_modules, lock files
  if [[ "$file" =~ \.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|mp4|webm|mp3|wav|ogg|apk|zip|tar\.gz|sqlite|bin)$ ]]; then
    continue
  fi
  if [[ "$file" =~ node_modules|pnpm-lock\.yaml|package-lock\.json|\.tsbuildinfo$|\.next/|\.wrangler/ ]]; then
    continue
  fi

  if [ ! -f "$file" ]; then
    continue
  fi

  for pattern in "${PATTERNS[@]}"; do
    if grep -qE "$pattern" "$file" 2>/dev/null; then
      MATCHES=$(grep -nE "$pattern" "$file" 2>/dev/null || true)
      if [ -n "$MATCHES" ]; then
        echo -e "${RED}[SECRET DETECTED]${NC} $file"
        echo "$MATCHES" | while read -r line; do
          echo "  Line $line"
        done
        FOUND_SECRET=1
        SECRET_FILES="$SECRET_FILES  $file\n"
      fi
    fi
  done

  # Also check for .env file patterns (shouldn't be committed)
  if [[ "$file" =~ \.env$|\.env\.local$|\.env\.local-backup$ ]]; then
    if grep -qE '[A-Z_]+=.{10,}' "$file" 2>/dev/null; then
      echo -e "${RED}[.env FILE DETECTED]${NC} $file — .env files should not be committed"
      FOUND_SECRET=1
    fi
  fi
done

if [ "$FOUND_SECRET" -eq 1 ]; then
  echo ""
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  COMMIT BLOCKED: Secrets detected in staged files${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "The files above contain patterns that look like API keys,"
  echo -e "tokens, or private keys."
  echo ""
  echo -e "${YELLOW}To fix:${NC}"
  echo -e "  1. Replace hardcoded keys with environment variables"
  echo -e "     e.g., \${PROVIDER_API_KEY} or process.env.PROVIDER_API_KEY"
  echo -e "  2. If this is a false positive, use:"
  echo -e "     git commit --no-verify"
  echo -e "     (please ensure it really is a false positive first)"
  echo ""
  exit 1
fi

exit 0
