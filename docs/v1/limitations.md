# Limitations & Technical Debt

## Known Limitations

### 1. Platform Dependencies

**Issue**: Verification checks use shell commands that may behave differently across platforms.

**Impact**:
- `grep` flags differ between macOS (BSD) and Linux (GNU)
- Line endings (`\r\n` vs `\n`) affect pattern matching
- Path separators (`/` vs `\`) break cross-platform paths

**Mitigation**: Use Node.js-based checks instead of shell where possible.

---

### 2. AI Provider Rate Limits

**Issue**: No built-in rate limiting for AI provider calls.

**Impact**:
- May hit API limits during long-running autonomous runs
- No queuing or prioritization of AI requests
- Cost unpredictability

**Mitigation**: Implement request throttling in AI factory.

---

### 3. No Built-in Caching of AI Responses

**Issue**: Each convergence wave re-evaluates all goals, generating repeated AI calls.

**Impact**:
- Slow convergence loops
- High API costs
- Environmental impact

**Mitigation**: Cache eval results with gap fingerprinting.

---

### 4. Limited Support for Long-Running Tasks

**Issue**: Task timeout is configurable but checkpointing during task execution is not supported.

**Impact**:
- Long tasks cannot be safely interrupted
- Crash during task leaves partial work
- No way to inspect mid-task state

**Mitigation**: Break long tasks into smaller subtasks.

---

### 5. Git Conflicts on Concurrent Edits

**Issue**: Multiple AI agents editing same files can cause git conflicts.

**Impact**:
- `git pull` or `git push` may fail mid-run
- Conflict resolution not automated
- State may become inconsistent

**Mitigation**: Single-agent mode or file locking mechanism.

---

### 6. No Incremental Verification

**Issue**: All checks run after every task, even if files haven't changed.

**Impact**:
- Slow feedback loops
- Wasted compute on unchanged artifacts
- Counterintuitive when partial changes fail unrelated checks

**Mitigation**: Implement file fingerprinting to skip unchanged checks.

---

### 7. Gap Detection is Heuristic

**Issue**: Gap detection relies on goal evaluation, which may produce false positives/negatives.

**Impact**:
- System may generate unnecessary work
- Real gaps may be missed
- Convergence may not mean correctness

**Mitigation**: Human oversight of goal definitions.

---

### 8. No State Migration Strategy

**Issue**: When storage format changes, existing `.converge/` directories may become incompatible.

**Impact**:
- Cannot upgrade Converge mid-project
- Must migrate manually or reset state
- Risk of data loss

**Mitigation**: Implement storage versioning with migration path.

---

## Technical Debt

### High Priority

1. **No Integration Tests**
   - Only unit tests exist
   - Integration behavior is unverified
   - Risk of regression

2. **No Error Classification**
   - All errors treated similarly
   - No distinction between retryable and fatal
   - May retry indefinitely on fatal errors

3. **Context Object Creation Overhead**
   - New context objects created per task
   - Memory pressure in long runs
   - GC overhead

### Medium Priority

4. **No Metric Persistence**
   - Metrics only in memory
   - Historical analysis unavailable
   - Hard to track improvement over time

5. **Hook Error Isolation Too Broad**
   - One hook failure isolates all subsequent hooks
   - Partial hook execution not supported
   - Debugging hook failures difficult

6. **No Dead Code Elimination**
   - All functions compiled even if unused
   - Larger bundle size
   - Slower startup

7. **Registry is Global Singleton**
   - Cannot run multiple Converge instances
   - Testing requires cleanup
   - Not thread-safe (though Node.js is single-threaded)

### Lower Priority

8. **No Telemetry**
   - No anonymous usage data
   - Hard to prioritize improvements
   - Unknown adoption

9. **Limited Documentation**
   - Many functions lack JSDoc
   - Type signatures not fully explained
   - Learning curve is steep

10. **No Performance Profiling**
    - No built-in profiling
    - Bottlenecks unidentified
    - Optimization is guesswork

## Areas Needing Investigation

### 1. Multi-Agent Coordination
- How should multiple AI agents work on the same project?
- File locking? Task partitioning? Conflict resolution?

### 2. Incremental Goal Satisfaction
- Can goals track partial satisfaction?
- How to measure progress toward non-binary goals?

### 3. Learning from Failure Patterns
- Should LEARN.md accumulate knowledge?
- Can patterns be generalized across projects?

### 4. Cost Estimation
- Can we predict AI costs before running?
- Should there be a budget mechanism?

### 5. Verification Soundness
- Are shell-based checks sufficient?
- When should formal verification be used?

## Deprecated Components

| Component | Status | Replacement |
|-----------|--------|-------------|
| `parseSkillMd` | Deprecated | `parseTaskMd` |
| `TaskFileScanner` (v1) | Deprecated | `TaskFileScanner` (v2 in planning/) |
| `SkillTaskDef` | Deprecated | `TaskMdDef` |
| `taskDef` (v1) | Deprecated | `taskDef` (v2, now default) |
