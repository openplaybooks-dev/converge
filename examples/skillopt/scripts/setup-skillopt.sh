#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_URL="https://github.com/microsoft/SkillOpt.git"
VENDOR_DIR="vendor/skillopt"

if [ -d "$VENDOR_DIR/.git" ]; then
  echo "SkillOpt already cloned at $VENDOR_DIR"
else
  echo "Cloning SkillOpt..."
  mkdir -p vendor
  git clone --depth 1 "$REPO_URL" "$VENDOR_DIR"
fi

PYTHON="${PYTHON:-python3}"
if ! "$PYTHON" -c "import sys; assert sys.version_info >= (3, 10), f'Need Python 3.10+, got {sys.version}'" 2>/dev/null; then
  echo "Error: Python 3.10+ required" >&2
  exit 1
fi

VENV="$VENDOR_DIR/.venv"
if [ ! -d "$VENV" ]; then
  echo "Creating venv..."
  "$PYTHON" -m venv "$VENV"
fi

echo "Installing SkillOpt dependencies..."
"$VENV/bin/pip" install -q -e "$VENDOR_DIR" 2>&1 | tail -1

echo "Verifying installation..."
"$VENV/bin/python" -c "import skillopt; print('skillopt installed')"

mkdir -p output/skills
echo "Setup complete."
