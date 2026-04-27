#!/bin/bash
# Download Quaternius packs from the trebeljahr/quaternius-showcase mirror.
# Reads /tmp/quat-pack-paths.txt (one repo path per line); strips the
# "public/glb/" prefix and mirrors files under
# examples/game-assets-lego/assets/quaternius/<pack>/<lowercase_filename>.glb.
#
# This is the same pattern used by scripts/dl-quat.sh, generalized over a
# multi-pack list. Re-runnable: existing files are silently overwritten by
# curl's -f so partial downloads can be resumed by re-invoking.

set -e
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin"

DEST="/Users/minh/Documents/converge/examples/game-assets-lego/assets/quaternius"
BASE="https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main"
LIST="${1:-/tmp/quat-pack-paths.txt}"

if [ ! -f "$LIST" ]; then
  echo "missing path list: $LIST"
  exit 1
fi

mkdir -p "$DEST"

ok=0
fail=0
while IFS= read -r path; do
  # path: public/glb/<pack>/<File>.glb  →  rel: <pack>/<file>.glb (lowercased)
  rel="${path#public/glb/}"
  rel_lower=$(echo "$rel" | tr '[:upper:]' '[:lower:]')
  out="$DEST/$rel_lower"
  mkdir -p "$(dirname "$out")"
  if curl -sLfo "$out" "$BASE/$path"; then
    ok=$((ok+1))
  else
    fail=$((fail+1))
    echo "FAIL: $path"
  fi
done < "$LIST"

echo "OK: $ok  FAIL: $fail"
echo "Total size: $(du -sh "$DEST" | awk '{print $1}')"
