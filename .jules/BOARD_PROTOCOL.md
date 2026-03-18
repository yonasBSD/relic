# BOARD_PROTOCOL.md
# Location: .jules/BOARD_PROTOCOL.md

The board is a shared logbook. Agents write what they did, and read what
others have done before starting work.

Every agent reads three environment variables at startup:

```
RELIC_CLIENT_KEY   — this agent's auth key
RELIC_URL          — base URL of the Relic instance
RELIC_SPACE        — space ID used as the shared board
```

---

## Reading the board

Do this at the start of every session, before anything else. The board
accumulates over time — read selectively, not exhaustively.

**Step 1 — Fetch the full list (headers only, no content)**

```bash
ENTRIES=$(curl -s "$RELIC_URL/api/v1/spaces/$RELIC_SPACE/relics" \
  -H "X-Client-Key: $RELIC_CLIENT_KEY")
```

This returns `.relics[]` sorted by `created_at` descending. Each item
contains `id`, `name`, `tags`, and `created_at` — but not the content.
Use this list to decide *what* to read, before fetching anything.

**Step 2 — Read all your own entries**

Your full history is the most important context. Read every entry you
have ever posted, oldest first — this gives you complete continuity:
what you have done, what you have tried, what patterns you found, and
what you flagged for future runs.

```bash
MY_IDS=$(echo "$ENTRIES" | jq -r --arg tag "agent:$MY_AGENT_NAME" \
  '[.relics[] | select(any(.tags[]; . == $tag))] | reverse | .[].id')

for id in $MY_IDS; do
  echo "=== $(echo \"$ENTRIES\" | jq -r --arg id \"$id\" \
    '.relics[] | select(.id==$id) | .name') ==="
  curl -s "$RELIC_URL/${id}/raw" -H "X-Client-Key: $RELIC_CLIENT_KEY"
  echo
done
```

**Step 3 — Scan other agents' recent headers**

You don't need to read every other agent's full entry — just their
`name` field (which contains the one-line summary) from the last day or two.
Only fetch full content for entries that are directly relevant to your work.

```bash
# Print names of the 20 most recent entries — fast, no extra fetches
echo "$ENTRIES" | jq -r '.relics[:20] | .[] | "\(.created_at[:10])  \(.name)"'
```

Read the full content of an entry only when:
- Another agent touched files you are about to touch
- An entry is marked `blocked` and relates to your domain
- An entry from `atlas` or `meridian` describes a structural or feature
  change that affects your work

Everything else: the one-line summary in the `name` field is enough.

---

## Writing to the board

Post one entry when your session ends.

```bash
curl -s -X POST "$RELIC_URL/api/v1/relics" \
  -H "X-Client-Key: $RELIC_CLIENT_KEY" \
  -F "name=[agent-name]: [one-line summary]" \
  -F "content=[your session summary in markdown]" \
  -F "content_type=text/markdown" \
  -F "access_level=private" \
  -F "space_id=$RELIC_SPACE" \
  -F "tags=agent:[agent-name]"
```

---

## Entry format

Entries have two parts: a compact header with the essential facts, then
a details section for full context. Agents scan the header first and
only read details when they need to.

```markdown
**Agent:** [agent-name]
**Date:** YYYY-MM-DD
**Status:** done | blocked | in-progress
**Summary:** [one sentence — what happened this session]

---

## Details

### What I did
[What was completed this session]

### Files changed
[Files modified, or "none"]

### Issues found
[Anything worth attention from another agent, or "none"]

### Next time
[Useful context for the next run of this agent]
```

Keep both sections short and factual.

---

## Agent name convention

```
forge  palette  sentinel  compass  anchor  scribe  canary  atlas
meridian-1  meridian-2  meridian-3
```
