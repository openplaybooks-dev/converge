# Converge Feature Development Analysis

## Tổng quan hệ thống hiện tại

### CLI Commands có sẵn

| Command | Mô tả |
|---------|-------|
| `init` | Khởi tạo project mới |
| `run` | Chạy convergence loop (autonomous/semi-autonomous) |
| `reset` | Reset task về pending |
| `tree` | Hiển thị task tree |
| `status` | Kiểm tra trạng thái |
| `verify` | Verify task output |
| `show gantt\|graph\|journal` | Visualization |
| `goals` | Goal management |
| `plan` | Planning phase |
| `inspect` | Inspect task details |
| `cleanup` | Cleanup journal/checkpoint |
| `playbook` | Playbook management |
| `skills` | Skills management |
| `metrics` | Metrics reporting |
| `swebench\|tbench` | Benchmarking |

---

## Tính năng cần phát triển

### 1. Interactive Retry Flow (HIGH PRIORITY)

**Vấn đề**: Khi task fail, hệ thống tự retry 2-3 lần rồi dừng. Không có cơ chế để user can thiệp thủ công.

**Cần phát triển**:
```
converge retry <task-id>           # Retry failed task
converge retry <task-id> --inspect # Xem lỗi trước khi retry
converge unblock <task-id>          # Unblock blocked task
converge fix <task-id> --strategy  # Chọn fix strategy thủ công
```

**Code locations**:
- `packages/core/src/cli/commands-reset.ts` — resetCommand mở rộng
- `packages/core/src/repair/strategies/` — thêm strategy cho manual fix

---

### 2. Task Dependency Visualization

**Vấn đề**: Tree hiện tại không show rõ dependency giữa các task.

**Cần phát triển**:
```
converge deps <task-id>             # Show dependencies
converge deps --tree                # Full dependency tree
converge deps --visual             # ASCII diagram
```

**Output mẫu**:
```
49. 001-lift-HeroSection (failed)
├── blocks: 50, 51, 52
├── depends on: 45 (001-split-HeroSection) ✓
└── retry count: 3/3
    └── last error: "Flutter widget not found"
```

**Code locations**:
- `packages/core/src/tree/task-tree.ts` — thêm `getBlockingTasks()`, `getDependencies()`
- `packages/core/src/cli/commands-tree.ts` — mở rộng tree display

---

### 3. Wave Progress Dashboard

**Vấn đề**: Không có view tổng quan tiến độ theo wave.

**Cần phát triển**:
```
converge wave                        # Show wave progress
converge wave --status              # Visual progress bar
converge wave --remaining           # List remaining tasks by wave
```

**Output mẫu**:
```
Wave 1 (red):  ████████████████████ 100%
Wave 2 (yellow): ████████████░░░░░░ 67%
Wave 3 (green):  ████░░░░░░░░░░░░░░ 25%
Wave 4 (blue):   ░░░░░░░░░░░░░░░░░░  0%

Epic: 003-beacon-detail
├── 49 failed (HeroSection lift)
├── 50 blocked (TechnicalAccordion)
└── 3 siblings pending
```

---

### 4. Smart Resume / Skip

**Vấn đề**: Muốn skip task fail để chạy tiếp sibling khác, phải reset thủ công.

**Cần phát triển**:
```
converge skip <task-id>             # Skip task, unblock siblings
converge skip <task-id> --force     # Force skip even if blocking
converge resume --skip-failed       # Auto-skip failed tasks on resume
```

**Code locations**:
- `packages/core/src/lifecycle/task-runner.ts` — thêm skip logic
- `packages/core/src/cli/commands-reset.ts` — mở rộng resetCommand

---

### 5. Parallel Execution Enhancement

**Vấn đề**: `--parallel` flag tồn tại nhưng không rõ behavior.

**Cần phát triển**:
```
converge run --parallel --max-parallel 4
converge run --parallel --max-parallel 4 --max-wait 30s
converge parallel-status           # Show running tasks
```

**Cần implement**:
- Task queue với max parallel
- Dependency-aware scheduling
- Resource contention detection
- Progress aggregation

**Code locations**:
- `packages/core/src/cli/commands-run.ts` — mở rộng parallel logic
- `packages/core/src/executor/` — task execution queue

---

### 6. Self-Healing Strategy Extensions

**Vấn đề**: Chỉ có vài strategy hiện tại (unblock, pattern repair, incomplete-producer).

**Cần phát triển**:
```
Strategy               Current    Needed
─────────────────────────────────────────
unblock                ✓          ✓ (good)
pattern-repair         ✓          ✓ (good)
incomplete-producer    ✓          ✓ (good)
missing-wbs-script     ✓          ✓ (good)
missing-input          ✓          ✓ (good)
feedback-writer        ✓          ✓ (good)

NEW:
- fix-compile-error    (analyze Flutter compile error, suggest fix)
- regenerate-widget    (regenerate Flutter widget from spec)
- merge-conflict       (resolve git merge conflicts in task outputs)
- dependency-repair    (fix broken imports/references)
```

**Code locations**:
- `packages/core/src/repair/strategies/` — thêm strategy classes

---

### 7. Checkpoint/State Inspection

**Vấn đề**: Debug checkpoint phức tạp, không có tool inspect.

**Cần phát triển**:
```
converge checkpoint --inspect                    # Show checkpoint raw
converge checkpoint --fix                       # Fix corrupted checkpoint
converge journal <task-id>                      # Show task journal
converge journal <task-id> --errors             # Show only errors
converge journal <task-id> --export <file.json> # Export journal
```

**Code locations**:
- `packages/core/src/checkpoint/` — CheckpointManager, UnitCheckpointManager
- `packages/core/src/journal/` — JournalAPI

---

### 8. Task Retry History / Audit Trail

**Vấn đề**: Không biết task đã retry bao nhiêu lần, lỗi gì ở mỗi lần.

**Cần phát triển**:
```
converge audit <task-id>             # Show retry history
converge audit <task-id> --timeline  # ASCII timeline
converge audit --summary             # Project-wide summary
converge audit --by-failure          # Group by failure type
```

**Code locations**:
- `packages/core/src/lifecycle/task-runner.ts` — ghi retry attempts
- `packages/core/src/checkpoint/unit-checkpoint.ts` — lưu attempt history

---

### 9. Epic-Level Commands

**Vấn đề**: Phải thao tác task by task, không có epic-level commands.

**Cần phát triển**:
```
converge epic <epic-id> --status              # Epic status
converge epic <epic-id> --retry-failed         # Retry all failed
converge epic <epic-id> --skip-failed         # Skip all failed
converge epic <epic-id> --reset               # Reset entire epic
converge epic <epic-id> --parallel            # Run all tasks parallel
```

---

### 10. Real-time Progress Streaming

**Vấn đề**: Chạy `run` không thấy progress update liên tục.

**Cần phát triển**:
```
converge run --watch                 # Real-time progress
converge run --watch --compact       # Compact view
converge run --progress              # Progress bar
```

**Features**:
- Live tree update
- Running task highlight
- Time elapsed
- ETA calculation

---

## Priority Matrix

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Interactive Retry Flow | Medium | High |
| 2 | Task Dependency Viz | Low | High |
| 3 | Smart Skip/Resume | Low | High |
| 4 | Checkpoint Inspection | Low | Medium |
| 5 | Wave Progress Dashboard | Medium | Medium |
| 6 | Retry History/Audit | Medium | Medium |
| 7 | Epic-Level Commands | Medium | Medium |
| 8 | Parallel Enhancement | High | High |
| 9 | Self-Healing Extensions | High | High |
| 10 | Real-time Progress | High | Medium |

---

## Notes

- **Effort**: Low = 1-2 days, Medium = 3-5 days, High = 1+ week
- **Impact**: High = solves major pain point, Medium = improves UX, Low = nice-to-have
- Các features 1-3 có thể implement trước vì giải quyết pain point ngay
- Features 8-10 đòi hỏi refactoring architecture lớn hơn