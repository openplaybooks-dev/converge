#!/bin/bash
# Test HEARTBEAT logging directly by simulating a slow startup

set -e

echo "Testing HEARTBEAT logging..."
echo ""

cd ../../../workspace

# Clean up
rm -rf /tmp/test-heartbeat-logs

# Create a test that will hang for 30 seconds
cat > /tmp/test-heartbeat-prompt.txt <<'EOF'
Please wait 25 seconds before responding, then say "Done waiting!"
EOF

echo "Running claudefn with intentional delay..."
timeout 35 node ../harness/packages/claudefn/dist/index.js \
  --prompt "$(cat /tmp/test-heartbeat-prompt.txt)" \
  --log-dir /tmp/test-heartbeat-logs \
  > /tmp/test-heartbeat-output.log 2>&1 &

CLAUDEFN_PID=$!
sleep 2

echo "Waiting for log file to be created..."
for i in {1..10}; do
  LOG_FILE=$(ls -t /tmp/test-heartbeat-logs/*.log 2>/dev/null | head -1 || echo "")
  if [ -n "$LOG_FILE" ]; then
    echo "Found log file: $LOG_FILE"
    break
  fi
  sleep 1
done

if [ -z "$LOG_FILE" ]; then
  echo "❌ No log file created"
  exit 1
fi

echo ""
echo "Watching for HEARTBEAT messages (will check every 5s for 30s)..."
echo ""

for i in {1..6}; do
  sleep 5
  HEARTBEATS=$(grep -c "\[HEARTBEAT\]" "$LOG_FILE" 2>/dev/null || echo "0")
  echo "Check $i (${i}×5=$((i*5))s): $HEARTBEATS HEARTBEAT message(s)"

  if [ "$HEARTBEATS" -gt 0 ]; then
    echo ""
    echo "✅ HEARTBEAT messages found!"
    echo ""
    grep "\[HEARTBEAT\]" "$LOG_FILE"
    break
  fi
done

# Cleanup
kill $CLAUDEFN_PID 2>/dev/null || true
wait $CLAUDEFN_PID 2>/dev/null || true

if [ "$HEARTBEATS" -eq 0 ]; then
  echo ""
  echo "❌ No HEARTBEAT messages found after 30 seconds"
  echo ""
  echo "Log file contents:"
  cat "$LOG_FILE"
  exit 1
fi
