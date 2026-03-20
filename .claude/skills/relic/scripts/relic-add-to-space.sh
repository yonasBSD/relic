#!/bin/bash
# Add a relic to a space.
# Usage: relic-add-to-space.sh <space_id> <relic_id>
#
# Env vars:
#   RELIC_CLIENT_KEY  - authentication key
#   RELIC_BASE_URL    - base URL (default: http://localhost)

set -euo pipefail

BASE_URL="${RELIC_BASE_URL:-http://localhost}"

if [[ -z "${1:-}" || -z "${2:-}" ]]; then
    echo "Usage: relic-add-to-space.sh <space_id> <relic_id>" >&2
    exit 1
fi

SPACE_ID="$1"
RELIC_ID="$2"

CURL_ARGS=(-s -X POST "$BASE_URL/api/v1/spaces/$SPACE_ID/relics"
    -H "Content-Type: application/json"
    -d "{\"relic_id\": \"$RELIC_ID\"}")

if [[ -n "${RELIC_CLIENT_KEY:-}" ]]; then
    CURL_ARGS+=(-H "X-Client-Key: $RELIC_CLIENT_KEY")
fi

curl "${CURL_ARGS[@]}" > /dev/null
