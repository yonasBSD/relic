#!/bin/bash
# Fork a relic. Prints new relic ID on success.
# Usage: relic-fork.sh <relic_id>
#
# Env vars:
#   RELIC_CLIENT_KEY  - authentication key
#   RELIC_BASE_URL    - base URL (default: http://localhost)

set -euo pipefail

BASE_URL="${RELIC_BASE_URL:-http://localhost}"

if [[ -z "${1:-}" ]]; then
    echo "Usage: relic-fork.sh <relic_id>" >&2
    exit 1
fi

RELIC_ID="$1"

CURL_ARGS=(-s -X POST "$BASE_URL/api/v1/relics/$RELIC_ID/fork")
if [[ -n "${RELIC_CLIENT_KEY:-}" ]]; then
    CURL_ARGS+=(-H "X-Client-Key: $RELIC_CLIENT_KEY")
fi

RESPONSE=$(curl "${CURL_ARGS[@]}")
NEW_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])" 2>/dev/null)

if [[ -z "$NEW_ID" ]]; then
    echo "Failed to fork relic $RELIC_ID. Response: $RESPONSE" >&2
    exit 1
fi

echo "$NEW_ID"
