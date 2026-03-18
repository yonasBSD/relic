# BOARD_PROTOCOL.md
# Location: .Jules/BOARD_PROTOCOL.md

The board is a Relic Space shared by all agents as a coordination layer.
Each agent reads three environment variables at startup:

```
RELIC_CLIENT_KEY   — this agent's auth key
RELIC_URL          — base URL of the Relic instance (e.g. http://localhost)
RELIC_SPACE        — space ID used as the shared board
```

All coordination — claiming files, posting plans, sending handoffs, asking questions —
happens by posting relics into this space and reading relics from it.
No commits, no shared filesystem, no infrastructure beyond the running Relic service.

---

## Posting a Message

```bash
curl -s -X POST "$RELIC_URL/api/v1/relics" \
  -H "X-Client-Key: $RELIC_CLIENT_KEY" \
  -F "name=[title]" \
  -F "content=[JSON or markdown]" \
  -F "content_type=application/json" \
  -F "access_level=public" \
  -F "space_id=$RELIC_SPACE" \
  -F "tags=board,from:$MY_AGENT_NAME,to:[recipient],type:[msg-type],[status-tag]"
```

The response contains `id` — the message ID. Store it to reference this message in replies.

`to:` can be a specific agent name or `broadcast`.

## Reading the Board

```bash
BOARD=$(curl -s "$RELIC_URL/api/v1/spaces/$RELIC_SPACE/relics" \
  -H "X-Client-Key: $RELIC_CLIENT_KEY")
```

Returns `.relics[]` sorted by `created_at`. Filter with `jq`:

```bash
# Messages addressed to you
echo $BOARD | jq --arg me "$MY_AGENT_NAME" \
  '[.relics[] | select(any(.tags[]; . == ("to:"+$me) or . == "to:broadcast"))]'

# All active claims → build the file ownership map
echo $BOARD | jq \
  '[.relics[] | select(any(.tags[]; . == "type:claim") and any(.tags[]; . == "status:active"))
   | .content | fromjson | .files[]] | unique'

# Replies to a message
echo $BOARD | jq --arg id "MSG-ID" \
  '[.relics[] | select(any(.tags[]; . == ("re:"+$id)))]'
```

## Replying

Include the original ID in a `re:` tag and in the body:

```bash
-F "content={\"re\": \"ORIGINAL-ID\", ...}"
-F "tags=...,re:ORIGINAL-ID"
```

---

## Message Types

| `type:` tag | When to use |
|---|---|
| `plan` | Before claiming — what you'll do, which files, risks |
| `claim` | You are working on this; these files are yours |
| `release` | Done or abandoned; files are free |
| `handoff` | Work completed that requires follow-up from another agent |
| `blocker` | Cannot proceed until something is resolved |
| `question` | Need a decision before acting |
| `answer` | Response to a question |
| `fyi` | Informational; no action needed |

## Status Tags

`status:active` · `status:done` · `status:abandoned`

---

## Standard Message Shapes

### Plan
```bash
PLAN=$(curl -s -X POST "$RELIC_URL/api/v1/relics" \
  -H "X-Client-Key: $RELIC_CLIENT_KEY" \
  -F "name=plan: $MY_AGENT_NAME — [task]" \
  -F "content=## What
[what you found and intend to do]

## Files
[every file you expect to touch]

## Risks
[migration? shared file? new dependency?]" \
  -F "content_type=text/markdown" \
  -F "access_level=public" \
  -F "space_id=$RELIC_SPACE" \
  -F "tags=board,from:$MY_AGENT_NAME,to:broadcast,type:plan,status:active")
PLAN_ID=$(echo $PLAN | jq -r '.id')
```

### Claim
```bash
CLAIM=$(curl -s -X POST "$RELIC_URL/api/v1/relics" \
  -H "X-Client-Key: $RELIC_CLIENT_KEY" \
  -F "name=claim: $MY_AGENT_NAME — [task]" \
  -F "content=$(jq -n \
      --arg agent "$MY_AGENT_NAME" --arg task "[task]" \
      --arg plan  "$PLAN_ID" \
      --argjson files '["path/to/file1","path/to/file2"]' \
      '{agent:$agent,task:$task,plan:$plan,files:$files}')" \
  -F "content_type=application/json" \
  -F "access_level=public" \
  -F "space_id=$RELIC_SPACE" \
  -F "tags=board,from:$MY_AGENT_NAME,to:broadcast,type:claim,status:active")
CLAIM_ID=$(echo $CLAIM | jq -r '.id')
```

After posting, wait 10 seconds and re-read. If another agent has a conflicting claim with an earlier `created_at`, release yours and pick different work.

### Release
```bash
curl -s -X POST "$RELIC_URL/api/v1/relics" \
  -H "X-Client-Key: $RELIC_CLIENT_KEY" \
  -F "name=release: $MY_AGENT_NAME — [task] ([done|abandoned])" \
  -F "content=$(jq -n \
      --arg re "$CLAIM_ID" --arg status "[done|abandoned]" --arg note "[summary]" \
      '{re:$re,status:$status,note:$note}')" \
  -F "content_type=application/json" \
  -F "access_level=public" \
  -F "space_id=$RELIC_SPACE" \
  -F "tags=board,from:$MY_AGENT_NAME,to:broadcast,type:release,status:[done|abandoned],re:$CLAIM_ID"
```

### Handoff
```bash
curl -s -X POST "$RELIC_URL/api/v1/relics" \
  -H "X-Client-Key: $RELIC_CLIENT_KEY" \
  -F "name=handoff → [target]: [description]" \
  -F "content=$(jq -n \
      --arg re "$CLAIM_ID" --arg detail "[what needs doing and where]" \
      '{re:$re,detail:$detail}')" \
  -F "content_type=application/json" \
  -F "access_level=public" \
  -F "space_id=$RELIC_SPACE" \
  -F "tags=board,from:$MY_AGENT_NAME,to:[target],type:handoff,status:active,re:$CLAIM_ID"
```

---

## Startup Sequence (every agent, every session)

```bash
BOARD=$(curl -s "$RELIC_URL/api/v1/spaces/$RELIC_SPACE/relics" \
  -H "X-Client-Key: $RELIC_CLIENT_KEY")

# 1. Pending handoffs for you — process before any self-directed work
HANDOFFS=$(echo $BOARD | jq --arg me "$MY_AGENT_NAME" \
  '[.relics[] | select(
    any(.tags[]; . == "type:handoff") and
    any(.tags[]; . == ("to:"+$me)) and
    any(.tags[]; . == "status:active"))]')

# 2. Your own active claim — resume it; do not start new work while one is open
ACTIVE=$(echo $BOARD | jq --arg me "$MY_AGENT_NAME" \
  'first(.relics[] | select(
    any(.tags[]; . == "type:claim") and
    any(.tags[]; . == "status:active") and
    any(.tags[]; . == ("from:"+$me))))')

# 3. File ownership map — do not touch files owned by others
OWNED=$(echo $BOARD | jq \
  '[.relics[] | select(
    any(.tags[]; . == "type:claim") and
    any(.tags[]; . == "status:active"))
   | .content | fromjson | .files[]] | unique')
```

**Skip the claim for read-only work** (audits, schema checks, documentation reads).
Claims are only required when you will write files.

---

## Agent Name Convention

Lowercase, hyphen-separated. Multiple instances of the same type append a number:

```
forge  palette  sentinel  compass  anchor  scribe  canary  atlas
meridian-1  meridian-2  meridian-3
```
