#!/bin/bash
# Save a file as a relic. Prints relic ID on success.
# Usage: relic-save.sh <file_path> [--name "Title"] [--space <space_id>] [--public]
#
# Env vars:
#   RELIC_CLIENT_KEY  - authentication key (required for private relics)
#   RELIC_BASE_URL    - base URL (default: http://localhost)

set -euo pipefail

BASE_URL="${RELIC_BASE_URL:-http://localhost}"
FILE=""
NAME=""
SPACE_ID=""
ACCESS_LEVEL="private"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --name) NAME="$2"; shift 2 ;;
        --space) SPACE_ID="$2"; shift 2 ;;
        --public) ACCESS_LEVEL="public"; shift ;;
        -*) echo "Unknown flag: $1" >&2; exit 1 ;;
        *) FILE="$1"; shift ;;
    esac
done

if [[ -z "$FILE" ]]; then
    echo "Usage: relic-save.sh <file_path> [--name Title] [--space space_id] [--public]" >&2
    exit 1
fi

if [[ ! -f "$FILE" ]]; then
    echo "File not found: $FILE" >&2
    exit 1
fi

# Build curl args
CURL_ARGS=(-s -X POST "$BASE_URL/api/v1/relics" -F "file=@$FILE" -F "access_level=$ACCESS_LEVEL")

if [[ -n "${RELIC_CLIENT_KEY:-}" ]]; then
    CURL_ARGS+=(-H "X-Client-Key: $RELIC_CLIENT_KEY")
fi

if [[ -n "$NAME" ]]; then
    CURL_ARGS+=(-F "name=$NAME")
fi

RESPONSE=$(curl "${CURL_ARGS[@]}")
RELIC_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])" 2>/dev/null)

if [[ -z "$RELIC_ID" ]]; then
    echo "Failed to create relic. Response: $RESPONSE" >&2
    exit 1
fi

# Add to space if requested
if [[ -n "$SPACE_ID" ]]; then
    curl -s -X POST "$BASE_URL/api/v1/spaces/$SPACE_ID/relics" \
        ${RELIC_CLIENT_KEY:+-H "X-Client-Key: $RELIC_CLIENT_KEY"} \
        -H "Content-Type: application/json" \
        -d "{\"relic_id\": \"$RELIC_ID\"}" > /dev/null
fi

echo "$RELIC_ID"
