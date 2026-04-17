#!/bin/bash
# Exact reproduction of the hang issue

set -e

echo "=================================================="
echo "Reproducing Claude CLI hang issue"
echo "=================================================="
echo ""

# Test 1: WITHOUT MCP bypass (current broken state)
echo "TEST 1: WITHOUT --strict-mcp-config (HANGS because Stitch MCP times out)"
echo "Command: claude --dangerously-skip-permissions -p --no-session-persistence"
echo ""

timeout 20 bash -c 'echo "Say hello" | claude --dangerously-skip-permissions -p --no-session-persistence' || {
    echo "❌ FAILED: Timed out after 20s (no output)"
    echo "   This confirms the hang issue!"
    echo ""
}

# Test 2: WITH MCP bypass (the fix)
echo "TEST 2: WITH --strict-mcp-config (WORKS - bypasses Stitch MCP)"
echo "Command: claude --dangerously-skip-permissions -p --no-session-persistence --strict-mcp-config --mcp-config /tmp/empty-mcp.json"
echo ""

echo '{"mcpServers":{}}' > /tmp/empty-mcp.json

timeout 20 bash -c 'echo "Say hello" | claude --dangerously-skip-permissions -p --no-session-persistence --strict-mcp-config --mcp-config /tmp/empty-mcp.json' && {
    echo "✅ SUCCESS: Got output within 20s"
    echo ""
}

rm -f /tmp/empty-mcp.json

echo "=================================================="
echo "CONCLUSION"
echo "=================================================="
echo "Test 1 fails (hangs) because Claude CLI tries to connect to"
echo "the Stitch HTTP MCP server configured in desktop config."
echo ""
echo "Test 2 works because --strict-mcp-config bypasses desktop"
echo "config and uses empty MCP servers instead."
echo ""
echo "FIX: Re-enable the MCP bypass mechanism in claudefn.ts"
echo "=================================================="
