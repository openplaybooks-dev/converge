#!/usr/bin/env bash
# preview.sh — build the Converge landing site, serve it, screenshot a
# page with headless Chrome, and print paths to PNG outputs.
#
# Usage:
#   preview.sh <page-slug> [crop-y-top] [crop-height]
#   preview.sh /
#   preview.sh /blog/playbook-anatomy 1200
#   PREVIEW_DEV=1 preview.sh /            # attach to running `pnpm dev`
#
# Environment assumptions:
#   - Run from anywhere — paths resolve from this script's location.
#   - Google Chrome installed at the standard macOS path (override with
#     CHROME=/path/to/chrome).
#   - ImageMagick (`magick`) available for cropping.
#   - pnpm available for build/preview (override the launcher via
#     PREVIEW_PKG_MGR=npm if needed).

set -euo pipefail

SLUG="${1:-/}"
CROP_Y="${2:-1200}"
CROP_H="${3:-700}"
PKG_MGR="${PREVIEW_PKG_MGR:-pnpm}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

if [[ -z "${SLUG}" ]]; then
  echo "usage: preview.sh <page-slug> [crop-y-top] [crop-height]" >&2
  echo "  example: preview.sh /" >&2
  echo "  example: preview.sh /blog/playbook-anatomy 1200" >&2
  exit 1
fi

# Resolve the landing repo root relative to this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
PREVIEW_DIR="/tmp/dg-preview"

if [[ ! -f "${REPO_ROOT}/astro.config.mjs" ]]; then
  echo "error: expected astro.config.mjs at ${REPO_ROOT}" >&2
  echo "       (script must live under <repo>/.claude/skills/converge-diagrams/scripts/)" >&2
  exit 1
fi

mkdir -p "${PREVIEW_DIR}"

SERVER_PID=""
cleanup() {
  if [[ -n "${SERVER_PID}" ]]; then
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [[ "${PREVIEW_DEV:-0}" == "1" ]]; then
  PORT=4321
  if ! lsof -ti:${PORT} >/dev/null 2>&1; then
    echo "▶ no pnpm dev on :${PORT} — starting one"
    (cd "${REPO_ROOT}" && ${PKG_MGR} dev >/tmp/dg-preview-srv.log 2>&1) &
    SERVER_PID=$!
    # Wait for the dev server to come up.
    for _ in $(seq 1 30); do
      sleep 0.5
      if curl -sfI "http://localhost:${PORT}/" >/dev/null 2>&1; then
        break
      fi
    done
  else
    echo "▶ attaching to running pnpm dev on :${PORT}"
  fi
else
  echo "▶ building landing site…"
  (cd "${REPO_ROOT}" && ${PKG_MGR} build >/tmp/dg-preview-build.log 2>&1)

  PORT=4322
  while lsof -ti:${PORT} >/dev/null 2>&1; do
    PORT=$((PORT + 1))
  done

  echo "▶ serving on :${PORT}"
  (cd "${REPO_ROOT}" && ${PKG_MGR} preview --port "${PORT}" --host 127.0.0.1 >/tmp/dg-preview-srv.log 2>&1) &
  SERVER_PID=$!
  for _ in $(seq 1 30); do
    sleep 0.5
    if curl -sfI "http://localhost:${PORT}/" >/dev/null 2>&1; then
      break
    fi
  done
fi

# Astro's default output layout is `<slug>/index.html`. Older
# `build.format: 'file'` output was `<slug>.html`. Support both.
SLUG_TRIMMED="${SLUG#/}"
URL="http://localhost:${PORT}/${SLUG_TRIMMED}"
[[ "${URL}" != */ ]] && URL_DIR="${URL}/" || URL_DIR="${URL}"

if curl -sfI "${URL_DIR}" >/dev/null 2>&1; then
  FETCH_URL="${URL_DIR}"
elif curl -sfI "${URL}.html" >/dev/null 2>&1; then
  FETCH_URL="${URL}.html"
else
  FETCH_URL="${URL_DIR}"
fi

echo "▶ screenshotting ${FETCH_URL}"

FULL_PNG="${PREVIEW_DIR}/full.png"
"${CHROME}" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --virtual-time-budget=3000 \
  --window-size=1400,5200 \
  --force-device-scale-factor=1 \
  --screenshot="${FULL_PNG}" \
  "${FETCH_URL}" 2>&1 | grep -v 'ERROR:net/cert' | tail -1 || true

if [[ ! -s "${FULL_PNG}" ]]; then
  echo "error: screenshot empty or missing" >&2
  exit 1
fi

CROP_PNG="${PREVIEW_DIR}/crop.png"
magick "${FULL_PNG}" -crop "1400x${CROP_H}+0+${CROP_Y}" "${CROP_PNG}"

echo ""
echo "✓ rendered"
echo "  full:  ${FULL_PNG}"
echo "  crop:  ${CROP_PNG} (y=${CROP_Y}, h=${CROP_H})"
echo ""
echo "Read the crop with the Read tool; if the target diagram is not in"
echo "view, rerun with a different crop-y-top (e.g. 800, 2400, 3200)."
