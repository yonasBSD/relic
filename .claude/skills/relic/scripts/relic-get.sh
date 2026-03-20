#!/bin/bash
# Fetch relic content and print to stdout.
# Usage: relic-get.sh <relic_id>
#
# Env vars:
#   RELIC_BASE_URL  - base URL (default: http://localhost)

set -euo pipefail

BASE_URL="${RELIC_BASE_URL:-http://localhost}"

if [[ -z "${1:-}" ]]; then
    echo "Usage: relic-get.sh <relic_id>" >&2
    exit 1
fi

RELIC_ID="$1"
curl -s --fail "$BASE_URL/$RELIC_ID/raw" || {
    echo "Failed to fetch relic: $RELIC_ID" >&2
    exit 1
}
