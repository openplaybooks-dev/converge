#!/bin/bash
# Test index log generation

set -e

echo "Testing index log generation..."
echo ""

cd ../../../workspace

# Run a simple harness step
echo "Running harness step..."
timeout 60 pnpm harness run --step > /tmp/harness-index-test.log 2>&1 || true

# Find the latest log files
LOG_DIR=".harness/journal/epics/02-ux-ui-design-screen-generation/tasks/002-generate-design-system/claudefn-logs"

if [ ! -d "$LOG_DIR" ]; then
  echo "❌ Log directory not found: $LOG_DIR"
  exit 1
fi

LATEST_LOG=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -1)
LATEST_INDEX=$(ls -t "$LOG_DIR"/*.index.jsonl 2>/dev/null | head -1)

if [ -z "$LATEST_LOG" ]; then
  echo "❌ No log file found"
  exit 1
fi

if [ -z "$LATEST_INDEX" ]; then
  echo "❌ No index file found"
  exit 1
fi

echo "✅ Found log files:"
echo "   Log:   $LATEST_LOG"
echo "   Index: $LATEST_INDEX"
echo ""

# Show index file stats
echo "📊 Index File Summary:"
echo ""

if command -v jq &> /dev/null; then
  echo "Event counts:"
  jq -r '.type + "." + .event' "$LATEST_INDEX" | sort | uniq -c | sed 's/^/  /'
  echo ""

  echo "Session info:"
  jq 'select(.event == "started" or .event == "completed")' "$LATEST_INDEX" | sed 's/^/  /'
  echo ""

  DURATION=$(jq -r 'select(.event == "completed") | .duration_ms' "$LATEST_INDEX" 2>/dev/null || echo "")
  if [ -n "$DURATION" ]; then
    SECONDS=$(echo "scale=2; $DURATION / 1000" | bc)
    echo "Total duration: ${SECONDS}s"
  fi

  STARTUP=$(jq -r 'select(.event == "first_output") | .duration_ms' "$LATEST_INDEX" 2>/dev/null || echo "")
  if [ -n "$STARTUP" ]; then
    STARTUP_SECONDS=$(echo "scale=2; $STARTUP / 1000" | bc)
    echo "Startup time: ${STARTUP_SECONDS}s"
  fi

  echo ""
  echo "Tools used:"
  jq -r 'select(.type == "tool" and .event == "call") | .data.tool' "$LATEST_INDEX" | sort | uniq -c | sed 's/^/  /'

  echo ""
  echo "Errors:"
  ERROR_COUNT=$(jq 'select(.type == "error")' "$LATEST_INDEX" | wc -l | tr -d ' ')
  if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "  ✅ No errors"
  else
    jq 'select(.type == "error")' "$LATEST_INDEX" | sed 's/^/  /'
  fi
else
  echo "Install jq for better analysis. Showing raw index:"
  cat "$LATEST_INDEX"
fi

echo ""
echo "📁 File sizes:"
LOG_SIZE=$(stat -f%z "$LATEST_LOG" 2>/dev/null || stat -c%s "$LATEST_LOG" 2>/dev/null || echo "0")
INDEX_SIZE=$(stat -f%z "$LATEST_INDEX" 2>/dev/null || stat -c%s "$LATEST_INDEX" 2>/dev/null || echo "0")

LOG_KB=$(echo "scale=2; $LOG_SIZE / 1024" | bc)
INDEX_KB=$(echo "scale=2; $INDEX_SIZE / 1024" | bc)

echo "  Log:   ${LOG_KB} KB"
echo "  Index: ${INDEX_KB} KB"

if [ "$INDEX_SIZE" -gt 0 ]; then
  RATIO=$(echo "scale=1; $LOG_SIZE / $INDEX_SIZE" | bc)
  echo "  Ratio: ${RATIO}x smaller"
fi

echo ""
echo "✅ Index log test complete!"
echo ""
echo "Try these commands:"
echo "  # View full index"
echo "  cat $LATEST_INDEX"
echo ""
echo "  # Count events by type"
echo "  jq -r '.type' $LATEST_INDEX | sort | uniq -c"
echo ""
echo "  # View only errors"
echo "  jq 'select(.type == \"error\")' $LATEST_INDEX"
echo ""
echo "  # View session summary"
echo "  jq 'select(.event == \"completed\")' $LATEST_INDEX"
