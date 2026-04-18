# claudefn Changelog

## v0.2.0 (2026-04-03)

### Breaking: Removed Default Log Directory

**Change**: `logDir` is now required - claudefn no longer creates logs in `.converge/logs/claudefn/` by default.

**Reason**: The centralized log directory was redundant. Converge already writes task-specific logs to `.converge/journal/epics/{epic}/tasks/{task}/claudefn-logs/`.

**Migration**:

- **Converge users**: ✅ No action needed - logs automatically go to journal
- **Standalone users**: ⚠️ Must now provide `logDir` parameter

See `BREAKING_CHANGES.md` for full migration guide.

### Added: Enhanced Index Logs - Maximum Debug Info, Minimal Size

**Feature**: Each execution creates dual log files:

1. **`.log`** - Full detailed logs
2. **`.index.jsonl`** - Enhanced compact index (NEW)

**Design Goal**: 90% of debugging should be possible using ONLY the index file.

**Tool Events Include**:

- **Smart parameter summaries**:
  - Read: `{ file: "path" }`
  - Write: `{ file: "path", size: 1234 }`
  - Edit: `{ file: "path", old_len: 100, new_len: 150 }`
  - Bash: `{ cmd: "npm install..." }`
- **Result previews or errors**:
  - Success: 150 char preview
  - Failure: Full error message

**Output Events Include**:

- Text: 200 chars of Claude's response
- Thinking: 200 chars of reasoning

**Error Events Include**:

- Full error message
- Stderr preview (200 chars)
- Exit code, PID, timing

**Example**:

```bash
# Debug without reading full log
jq 'select(.type == "error")' session.index.jsonl
jq 'select(.type == "tool" and .event == "result" and .data.success == false)' session.index.jsonl
```

See `INDEX_FORMAT.md` for complete documentation.

### Removed: Claude Debug Log Streaming

**Reason**: Too verbose, not needed with enhanced index + stream-json output.

### Removed: DEBUG Log Entries

**Reason**: Reduced log noise. Process spawn and stdin events no longer logged.

### Fixed: HEARTBEAT Logging

**Issue**: HEARTBEAT messages weren't appearing because debug log streaming set `hasInitialActivity` too early.

**Fix**: HEARTBEAT now continues until actual Claude output is received.

## v0.1.0 (2026-04-02)

- Initial implementation
- Basic claudefn CLI wrapper
- Stream mode support
- MCP bypass mechanism
- Activity-based timeouts
