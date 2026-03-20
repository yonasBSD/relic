#!/bin/bash
# Find a space by name or create it. Prints space ID on success.
# Usage: relic-ensure-space.sh "Space Name" ["Description"]
#
# Env vars:
#   RELIC_CLIENT_KEY  - authentication key (required)
#   RELIC_BASE_URL    - base URL (default: http://localhost)

set -euo pipefail

BASE_URL="${RELIC_BASE_URL:-http://localhost}"

if [[ -z "${1:-}" ]]; then
    echo "Usage: relic-ensure-space.sh \"Space Name\" [\"Description\"]" >&2
    exit 1
fi

SPACE_NAME="$1"
DESCRIPTION="${2:-}"

AUTH_HEADER=""
if [[ -n "${RELIC_CLIENT_KEY:-}" ]]; then
    AUTH_HEADER="X-Client-Key: $RELIC_CLIENT_KEY"
fi

# Search for existing space by name
EXISTING_ID=$(curl -s "$BASE_URL/api/v1/spaces" \
    ${AUTH_HEADER:+-H "$AUTH_HEADER"} | \
    python3 -c "
import sys, json
spaces = json.load(sys.stdin)
name = $(python3 -c "import sys; print(repr('$SPACE_NAME'))")
for s in spaces:
    if s.get('name') == name:
        print(s['id'])
        break
" 2>/dev/null)

if [[ -n "$EXISTING_ID" ]]; then
    echo "$EXISTING_ID"
    exit 0
fi

# Create new space
PAYLOAD="{\"name\": $(python3 -c "import json; print(json.dumps('$SPACE_NAME'))")}"
if [[ -n "$DESCRIPTION" ]]; then
    PAYLOAD="{\"name\": $(python3 -c "import json; print(json.dumps('$SPACE_NAME'))"), \"description\": $(python3 -c "import json; print(json.dumps('$DESCRIPTION'))")}"
fi

RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/spaces" \
    ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

SPACE_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])" 2>/dev/null)

if [[ -z "$SPACE_ID" ]]; then
    echo "Failed to create space '$SPACE_NAME'. Response: $RESPONSE" >&2
    exit 1
fi

echo "$SPACE_ID"
