# Index Log Format - Enhanced for Maximum Debug Value

## Overview

The `.index.jsonl` file provides **maximum debugging information in minimal space**.

Each line contains everything you need to understand what happened, without reading the full `.log` file.

## Design Principle

**Maximum info, minimal chars** - Each index entry includes:
- ✅ What tool was called and with what parameters
- ✅ What the result was (success/failure + preview or error)
- ✅ Timing information for performance analysis
- ✅ Error messages for quick diagnosis
- ⚠️ Only look at full `.log` file when you need complete output

## Tool Events - Enhanced

### `tool.call` - What was called

Includes **tool-specific parameter summaries** for quick understanding:

#### Read Tool
```json
{"ts":"2026-04-03T01:16:52.456Z","type":"tool","event":"call","data":{"tool":"Read","id":"toolu_01ABC","input":{"file":".claude/skills/002-generate-design-system/SKILL.md"}}}
```

#### Write Tool
```json
{"ts":"2026-04-03T01:17:10.123Z","type":"tool","event":"call","data":{"tool":"Write","id":"toolu_01DEF","input":{"file":".stitch/DESIGN.md","size":14523}}}
```

#### Edit Tool
```json
{"ts":"2026-04-03T01:17:20.456Z","type":"tool","event":"call","data":{"tool":"Edit","id":"toolu_01GHI","input":{"file":"src/index.ts","old_len":150,"new_len":200}}}
```

#### Bash Tool
```json
{"ts":"2026-04-03T01:17:30.789Z","type":"tool","event":"call","data":{"tool":"Bash","id":"toolu_01JKL","input":{"cmd":"cd workspace && pnpm converge run --step"}}}
```

#### Grep Tool
```json
{"ts":"2026-04-03T01:17:40.123Z","type":"tool","event":"call","data":{"tool":"Grep","id":"toolu_01MNO","input":{"pattern":"SKILL.md","path":"artifacts/"}}}
```

#### Glob Tool
```json
{"ts":"2026-04-03T01:17:50.456Z","type":"tool","event":"call","data":{"tool":"Glob","id":"toolu_01PQR","input":{"pattern":"**/*.ts"}}}
```

### `tool.result` - What happened

Includes **result preview** (success) or **error message** (failure):

#### Success with Preview
```json
{"ts":"2026-04-03T01:16:53.789Z","type":"tool","event":"result","data":{"tool_use_id":"toolu_01ABC","success":true,"size":1234,"preview":"---\nname: generate-design-system\ndescription: Generate complete design system..."}}
```

#### Error with Message
```json
{"ts":"2026-04-03T01:17:25.123Z","type":"tool","event":"result","data":{"tool_use_id":"toolu_01GHI","success":false,"size":89,"error":"Error: ENOENT: no such file or directory, open '/path/to/missing-file.txt'"}}
```

## Output Events - Enhanced

### `output.text` - What Claude said

Includes **200 chars of text** for context:

```json
{"ts":"2026-04-03T01:17:15.456Z","type":"output","event":"text","data":{"text":"I'll read the skill file to understand the task requirements. The skill instructs me to invoke the /taste-design skill to generate a design system.","size":160}}
```

### `thinking.reasoning` - What Claude thought

Includes **200 chars of reasoning** to understand Claude's decision-making:

```json
{"ts":"2026-04-03T01:17:10.123Z","type":"thinking","event":"reasoning","data":{"text":"Let me analyze the requirements. The user wants to generate a design system with specific color schemes and typography. I should first read the existing DESIGN.md to see what's already defined.","size":456}}
```

## Error Events - Enhanced

All errors include **full error messages** and **context** for debugging:

### Startup Timeout
```json
{"ts":"2026-04-03T01:19:21.541Z","type":"error","event":"startup_timeout","duration_ms":180000,"data":{"timeout_s":180,"message":"Claude CLI hung on startup (no output after 180s) - likely too many skills or MCP connection issue","pid":6510}}
```

### Process Died
```json
{"ts":"2026-04-03T01:17:45.123Z","type":"error","event":"process_died","duration_ms":83582,"data":{"pid":6510,"elapsed_s":83,"message":"Claude CLI process died unexpectedly (PID=6510 not found after 83s)"}}
```

### Process Terminated
```json
{"ts":"2026-04-03T01:18:30.456Z","type":"error","event":"process_terminated","duration_ms":128915,"data":{"exit_code":null,"message":"MCP server timeout - server did not respond within expected time","stderr_preview":"Error: connect ETIMEDOUT 192.168.1.100:8080\n    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1595:16)"}}
```

### Process Exit Error
```json
{"ts":"2026-04-03T01:18:45.789Z","type":"error","event":"process_exit_error","duration_ms":144248,"data":{"exit_code":1,"message":"claude exited with exit code 1","stderr_preview":"TypeError: Cannot read property 'map' of undefined\n    at /app/node_modules/claude/dist/index.js:123:45"}}
```

## Session Events

### Started
```json
{"ts":"2026-04-03T01:16:21.541Z","type":"session","event":"started","data":{"session_id":"ff92c620-86b3-4faf-aa9c-ee98c9c7335d","timeout_ms":300000}}
```

### Completed
```json
{"ts":"2026-04-03T01:18:45.123Z","type":"session","event":"completed","duration_ms":143582,"data":{"tool_calls":12,"thinking_blocks":3,"text_blocks":8}}
```

## Process Events

### Spawned
```json
{"ts":"2026-04-03T01:16:21.542Z","type":"process","event":"spawned","data":{"pid":6510}}
```

### First Output (Startup Complete)
```json
{"ts":"2026-04-03T01:16:50.123Z","type":"process","event":"first_output","duration_ms":28582}
```

## Debugging Workflow

### 1. Quick Scan (Index Only)

```bash
INDEX="task/claudefn-logs/session.index.jsonl"

# Did it succeed?
jq 'select(.event == "completed")' $INDEX

# Any errors?
jq 'select(.type == "error")' $INDEX

# What tools were called?
jq 'select(.type == "tool" and .event == "call") | .data.tool' $INDEX

# Which tool failed?
jq 'select(.type == "tool" and .event == "result" and .data.success == false)' $INDEX
```

### 2. Investigate Issue (Still Index Only)

```bash
# Show error details
jq 'select(.type == "error") | .data.message' $INDEX

# Show failed tool with input and error
jq 'select(.type == "tool" and .event == "call") | select(.data.id == "toolu_01ABC")' $INDEX
jq 'select(.type == "tool" and .event == "result") | select(.data.tool_use_id == "toolu_01ABC")' $INDEX
```

### 3. Need Full Details? (Go to Log)

Only now do you need the full `.log` file:

```bash
LOG="task/claudefn-logs/session.log"

# Get complete tool input/output
grep -A 20 "Tool: Read" $LOG | grep -A 15 "Input:"
grep -A 100 "TOOL_RESULT" $LOG | head -50
```

## Real Example

Here's what a typical debugging session looks like with the enhanced index:

```jsonl
{"ts":"2026-04-03T01:16:21.541Z","type":"session","event":"started","data":{"session_id":"ff92c620...","timeout_ms":300000}}
{"ts":"2026-04-03T01:16:21.542Z","type":"process","event":"spawned","data":{"pid":6510}}
{"ts":"2026-04-03T01:16:50.123Z","type":"process","event":"first_output","duration_ms":28582}
{"ts":"2026-04-03T01:16:52.456Z","type":"tool","event":"call","data":{"tool":"Read","id":"toolu_01ABC","input":{"file":".claude/skills/002-generate-design-system/SKILL.md"}}}
{"ts":"2026-04-03T01:16:53.789Z","type":"tool","event":"result","data":{"tool_use_id":"toolu_01ABC","success":true,"size":1234,"preview":"---\nname: generate-design-system..."}}
{"ts":"2026-04-03T01:17:10.123Z","type":"thinking","event":"reasoning","data":{"text":"Let me analyze the requirements. The user wants...","size":456}}
{"ts":"2026-04-03T01:17:15.456Z","type":"output","event":"text","data":{"text":"I'll read the skill file to understand the task requirements.","size":62}}
{"ts":"2026-04-03T01:17:20.456Z","type":"tool","event":"call","data":{"tool":"Write","id":"toolu_01DEF","input":{"file":".stitch/DESIGN.md","size":14523}}}
{"ts":"2026-04-03T01:17:25.123Z","type":"tool","event":"result","data":{"tool_use_id":"toolu_01DEF","success":false,"size":89,"error":"Error: ENOENT: no such file or directory, open '.stitch/DESIGN.md'"}}
{"ts":"2026-04-03T01:17:30.789Z","type":"error","event":"process_exit_error","duration_ms":69247,"data":{"exit_code":1,"message":"Tool execution failed","stderr_preview":"Error: ENOENT: no such file or directory..."}}
```

**From this index alone, you can see**:
- ✅ Process started and took 28.5s to start up
- ✅ Read skill file successfully (1234 bytes)
- ✅ Claude thought about the requirements
- ✅ Tried to Write to `.stitch/DESIGN.md`
- ❌ Write failed - directory doesn't exist
- ❌ Session failed with exit code 1

**You can debug this WITHOUT reading the full log** - just create the `.stitch/` directory!

## Summary

The enhanced index gives you:
- ✅ **Tool inputs** - Know what parameters were used
- ✅ **Tool outputs** - See preview or error message
- ✅ **Claude's thoughts** - Understand reasoning
- ✅ **Error context** - Full error messages + stderr
- ✅ **Performance data** - Timing for every event

**90% of debugging can be done with the index alone.** Only use the full log when you need complete output.
