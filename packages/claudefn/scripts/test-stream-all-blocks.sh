#!/bin/bash
# Test that all Claude blocks are streamed to logs

set -e

echo "Testing all block streaming..."
echo ""

cd ../../../workspace

# Clean up
rm -rf .harness/journal/epics/02-ux-ui-design-screen-generation/tasks/002-generate-design-system/claudefn-logs/*.log

# Run a simple test
echo "Running harness..."
timeout 180 pnpm harness run --step > /tmp/harness-stream-test.log 2>&1 &
HARNESS_PID=$!

sleep 5

LOG_DIR=".harness/journal/epics/02-ux-ui-design-screen-generation/tasks/002-generate-design-system/claudefn-logs"

echo "Watching for streamed blocks..."
echo ""

for i in {1..30}; do
  sleep 5

  LATEST_LOG=$(ls -t "$LOG_DIR" 2>/dev/null | head -1)

  if [ -n "$LATEST_LOG" ]; then
    echo "=== Check $i (${i}×5 = $((i*5))s elapsed) ==="

    # Check for different block types
    if grep -q "STREAM_EVENT" "$LOG_DIR/$LATEST_LOG"; then
      EVENTS=$(grep -c "STREAM_EVENT" "$LOG_DIR/$LATEST_LOG")
      echo "✅ STREAM_EVENT: $EVENTS events"
    fi

    if grep -q "THINKING" "$LOG_DIR/$LATEST_LOG"; then
      THINKING=$(grep -c "THINKING" "$LOG_DIR/$LATEST_LOG")
      echo "✅ THINKING blocks: $THINKING"
      # Show first thinking block
      echo "   Sample: $(grep "THINKING" "$LOG_DIR/$LATEST_LOG" | head -1 | cut -c1-80)..."
    fi

    if grep -q "TEXT_BLOCK" "$LOG_DIR/$LATEST_LOG"; then
      TEXT=$(grep -c "TEXT_BLOCK" "$LOG_DIR/$LATEST_LOG")
      echo "✅ TEXT_BLOCK: $TEXT blocks"
    fi

    if grep -q "TOOL_USE" "$LOG_DIR/$LATEST_LOG"; then
      TOOLS=$(grep -c "TOOL_USE" "$LOG_DIR/$LATEST_LOG")
      echo "✅ TOOL_USE: $TOOLS tool calls"
    fi

    if grep -q "TOOL_RESULT" "$LOG_DIR/$LATEST_LOG"; then
      RESULTS=$(grep -c "TOOL_RESULT" "$LOG_DIR/$LATEST_LOG")
      echo "✅ TOOL_RESULT: $RESULTS results"
    fi

    if grep -q "FINAL_RESULT" "$LOG_DIR/$LATEST_LOG"; then
      echo "✅ FINAL_RESULT received - Task complete!"
      break
    fi

    echo ""
  fi
done

# Cleanup
kill $HARNESS_PID 2>/dev/null || true
wait $HARNESS_PID 2>/dev/null || true

echo ""
echo "Test complete. Check log for all block types:"
echo "$LOG_DIR/$(ls -t "$LOG_DIR" 2>/dev/null | head -1)"
