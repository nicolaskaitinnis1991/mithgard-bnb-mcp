#!/usr/bin/env bash
# Smoke test for mithgard-bnb-mcp.
# Usage: ./scripts/smoke.sh [IMAGE_TAG]
#   ./scripts/smoke.sh                                  # uses local dist/index.js
#   ./scripts/smoke.sh ghcr.io/.../mithgard-bnb-mcp:latest   # uses Docker image

set -euo pipefail

IMAGE="${1:-}"
EXPECTED_TOOLS=9
REQUEST='{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

if [ -n "$IMAGE" ]; then
  echo "Smoke-testing Docker image: $IMAGE"
  RESPONSE=$( (echo "$REQUEST"; sleep 2) | docker run --rm -i "$IMAGE" 2>/dev/null )
else
  echo "Smoke-testing local build: dist/index.js"
  if [ ! -f "dist/index.js" ]; then
    echo "  dist/index.js not found — running npm run build first..."
    npm run build
  fi
  RESPONSE=$( (echo "$REQUEST"; sleep 1) | node dist/index.js 2>/dev/null )
fi

# Pick the JSON-RPC response line (the one containing the tools array).
# stderr logs (pino) also start with '{' so we cannot just grab the first line.
RESPONSE=$(echo "$RESPONSE" | grep '"jsonrpc"' | head -1)

if [ -z "$RESPONSE" ]; then
  echo "  ❌ FAIL: no response from server"
  exit 1
fi

# Count tools in the response (look for tool name fields)
TOOL_COUNT=$(echo "$RESPONSE" | grep -o '"name":"[a-z_]*"' | wc -l | tr -d ' ')

if [ "$TOOL_COUNT" -ne "$EXPECTED_TOOLS" ]; then
  echo "  ❌ FAIL: expected $EXPECTED_TOOLS tools, got $TOOL_COUNT"
  echo "  Response: $RESPONSE"
  exit 1
fi

echo "  ✅ PASS: $TOOL_COUNT tools registered"
echo "$RESPONSE" | grep -o '"name":"[a-z_]*"' | sed 's/"name":/  • /; s/"//g'
