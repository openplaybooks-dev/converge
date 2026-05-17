#!/usr/bin/env bash
# Convert an episode's script.md to MP3 using MiniMax Text-to-Speech HD.
#
# Usage:
#   scripts/tts.sh                              # newest episode under episodes/
#   scripts/tts.sh episodes/2026-05-17          # explicit episode dir
#   scripts/tts.sh episodes/2026-05-17/script.md
#   VOICE_ID=presenter_male scripts/tts.sh      # override voice
#
# Reads:
#   ANTHROPIC_API_KEY    — your MiniMax key (the same one used for chat)
#   ANTHROPIC_BASE_URL   — optional; defaults to https://api.minimax.io
#   VOICE_ID             — optional; defaults to English_radiant_girl
#
# Writes:  <episode>/episode.mp3  (gitignored)
# Costs:   one MiniMax TTS HD call per run, ~$0.02-0.05 for a 6-8 min episode.
set -euo pipefail
cd "$(dirname "$0")/.."

# ---- args ----
TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  TARGET="$(ls -td episodes/*/ 2>/dev/null | head -1 || true)"
  if [ -z "$TARGET" ]; then
    echo "✗ no episodes/ found — run scripts/run.sh first" >&2
    exit 1
  fi
fi
if [ -d "$TARGET" ]; then
  SCRIPT_PATH="$TARGET/script.md"
elif [ -f "$TARGET" ]; then
  SCRIPT_PATH="$TARGET"
else
  echo "✗ not a file or directory: $TARGET" >&2
  exit 1
fi
SCRIPT_PATH="${SCRIPT_PATH%/}"
SCRIPT_PATH="$(printf '%s' "$SCRIPT_PATH" | sed 's://*:/:g')"
if [ ! -f "$SCRIPT_PATH" ]; then
  echo "✗ script not found: $SCRIPT_PATH" >&2
  exit 1
fi
EPISODE_DIR="$(dirname "$SCRIPT_PATH")"
OUT="$EPISODE_DIR/episode.mp3"

# ---- creds ----
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "✗ ANTHROPIC_API_KEY not set (this is your MiniMax key — see .env.example)" >&2
  exit 1
fi
BASE_URL="${ANTHROPIC_BASE_URL:-https://api.minimax.io}"
# Strip the /anthropic suffix if the chat base url was reused.
BASE_URL="${BASE_URL%/anthropic}"
BASE_URL="${BASE_URL%/}"
VOICE_ID="${VOICE_ID:-English_radiant_girl}"
MODEL="${MODEL:-speech-02-hd}"

# ---- strip markdown to plain narration ----
# Strip headings (## …), citations [Source: …](url), and code fences.
# Keep paragraph breaks as double newlines so MiniMax can pace itself.
PLAIN_TEXT="$(
  node -e '
    const fs = require("fs");
    let t = fs.readFileSync(process.argv[1], "utf8");
    // drop YAML frontmatter if any
    t = t.replace(/^---\n[\s\S]*?\n---\n/, "");
    // drop inline citations [Source: name](url) entirely
    t = t.replace(/\[Source:[^\]]*\]\([^)]+\)/g, "");
    // drop other markdown links [text](url) → text
    t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    // drop markdown headings (## Foo → Foo., narrator pause)
    t = t.replace(/^#{1,6}\s+(.+)$/gm, "$1.");
    // drop emphasis/bold markers
    t = t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
    // collapse 3+ newlines to 2
    t = t.replace(/\n{3,}/g, "\n\n");
    process.stdout.write(t.trim());
  ' "$SCRIPT_PATH"
)"

CHAR_COUNT=$(printf '%s' "$PLAIN_TEXT" | wc -m | tr -d ' ')
echo "── tts ──"
echo "  script:  $SCRIPT_PATH"
echo "  out:     $OUT"
echo "  voice:   $VOICE_ID"
echo "  model:   $MODEL"
echo "  chars:   $CHAR_COUNT"

# ---- chunk on paragraph boundaries (MiniMax t2a_v2 caps ~5000 chars/call) ----
export PLAIN_TEXT VOICE_ID MODEL
CHUNKS_JSON="$(mktemp)"
trap 'rm -f "$CHUNKS_JSON" $RESP_JSON_LIST' EXIT
node -e '
  const MAX = 4500;
  const paras = process.env.PLAIN_TEXT.split(/\n\n+/);
  const chunks = [];
  let buf = "";
  for (const p of paras) {
    if (!buf) { buf = p; continue; }
    if ((buf.length + 2 + p.length) <= MAX) { buf += "\n\n" + p; continue; }
    chunks.push(buf);
    buf = p;
    if (buf.length > MAX) {
      // single paragraph too long — hard-split on sentence boundary
      const sents = buf.split(/(?<=[.!?])\s+/);
      buf = "";
      for (const s of sents) {
        if ((buf.length + 1 + s.length) <= MAX) { buf = buf ? buf + " " + s : s; }
        else { if (buf) chunks.push(buf); buf = s; }
      }
    }
  }
  if (buf) chunks.push(buf);
  require("fs").writeFileSync(process.argv[1], JSON.stringify(chunks));
  console.error("  chunks:  " + chunks.length + " (max " + MAX + " chars each)");
' "$CHUNKS_JSON"

CHUNK_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CHUNKS_JSON')).length)")
RESP_JSON_LIST=""

# ---- one MiniMax call per chunk ----
: > "$OUT"
for i in $(seq 0 $((CHUNK_COUNT - 1))); do
  CHUNK_TEXT=$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('$CHUNKS_JSON'))[$i])")
  CHUNK_LEN=$(printf '%s' "$CHUNK_TEXT" | wc -m | tr -d ' ')
  echo "  → chunk $((i+1))/$CHUNK_COUNT ($CHUNK_LEN chars)..."

  REQ_BODY=$(CHUNK_TEXT="$CHUNK_TEXT" node -e '
    const payload = {
      model: process.env.MODEL,
      text: process.env.CHUNK_TEXT,
      stream: false,
      voice_setting: { voice_id: process.env.VOICE_ID, speed: 1.0, vol: 1.0, pitch: 0 },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
    };
    process.stdout.write(JSON.stringify(payload));
  ')

  RESP_JSON="$(mktemp)"
  RESP_JSON_LIST="$RESP_JSON_LIST $RESP_JSON"
  HTTP_CODE=$(
    curl -sS -o "$RESP_JSON" -w '%{http_code}' \
      -X POST "$BASE_URL/v1/t2a_v2" \
      -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
      -H "Content-Type: application/json" \
      --data-binary "$REQ_BODY"
  )
  if [ "$HTTP_CODE" != "200" ]; then
    echo "✗ MiniMax HTTP $HTTP_CODE on chunk $((i+1))" >&2
    head -c 1000 "$RESP_JSON" >&2; echo >&2
    exit 1
  fi

  node -e '
    const fs = require("fs");
    const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    if (body.base_resp && body.base_resp.status_code !== 0) {
      console.error("✗ MiniMax error: " + JSON.stringify(body.base_resp));
      process.exit(1);
    }
    const hex = body.data && body.data.audio;
    if (!hex) {
      console.error("✗ no .data.audio: " + JSON.stringify(body).slice(0, 500));
      process.exit(1);
    }
    fs.appendFileSync(process.argv[2], Buffer.from(hex, "hex"));
    const usage = body.extra_info || {};
    console.log("    bytes: " + Buffer.from(hex, "hex").length +
                (usage.audio_length_ms ? "  audio: " + (usage.audio_length_ms / 1000).toFixed(1) + "s" : "") +
                (usage.usage_characters ? "  billed: " + usage.usage_characters + " chars" : ""));
  ' "$RESP_JSON" "$OUT"
done

TOTAL_BYTES=$(wc -c < "$OUT" | tr -d ' ')
echo "✓ $OUT ($TOTAL_BYTES bytes, $CHUNK_COUNT chunks)"
