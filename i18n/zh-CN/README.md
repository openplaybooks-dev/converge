<div align="center">

![Converge — 自主 AI Agent Playbook](../../assets/brand/banner-v2.svg)

# 自主 AI Agent Playbook

**用于复杂、可重复、可验证 workflow 的 agent 执行与编排框架。**

[![npm version](https://img.shields.io/npm/v/@converge/core?color=cb3837&logo=npm&label=npm)](https://www.npmjs.com/package/@converge/core)
[![GitHub stars](https://img.shields.io/github/stars/myanlabs/converge?logo=github&color=181717)](https://github.com/myanlabs/converge/stargazers)
[![License: MIT](https://img.shields.io/github/license/myanlabs/converge?color=blue)](../../LICENSE)
[![Node](https://img.shields.io/node/v/@converge/core?color=339933&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7%2B-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Examples](https://img.shields.io/badge/playbooks-10-blue)](../../examples)
[![Providers](https://img.shields.io/badge/providers-Claude%20%7C%20Gemini%20%7C%20Kimi%20%7C%20Qwen%20%7C%20Codex-orange)](../../docs/getting-started/install.md)

[快速开始](#快速开始) · [示例](../../examples) · [文档](../../docs) · [翻译](../README.md) · [贡献](../../CONTRIBUTING.md)

</div>

---

## 工作方式

**你把 playbook 写成 Markdown 文件和目录。Converge 将它们编译为 DAG，并调度 AI agent 执行。**

```mermaid
graph LR
    A["一个大<br/>问题"] --> D["diverge<br/>拆成小块"]
    D --> T1["第 1 块"]
    D --> T2["第 2 块"]
    D --> T3["第 N 块"]
    T1 --> C["converge<br/>组装整体"]
    T2 --> C
    T3 --> C
    C --> R["一个完整<br/>解决方案"]

    style A fill:#E8A838,color:#222
    style R fill:#5DA05D,color:#fff
    style D fill:#4A90D9,color:#fff
    style C fill:#4A90D9,color:#fff
```

**心智模型：diverge → converge。** 把问题拆成独立部分，并行运行，再组装结果。它是递归的：任何一块都可以继续 diverge。

1. **`converge init`** — 用 provider 配置和目录结构初始化项目。
2. **`converge add`** — 拉取示例、从 prompt 生成，或手写 playbook。
3. **`converge run`** — 编译 DAG，调度 agent，并循环直到 checks 通过。每个 node：agent 完成工作，shell checks 验证结果。失败则重试，成功则缓存。

**编写 TASK.md 文件和目录。纯 Markdown。纳入版本控制。**

**共享 playbook，随时重新运行。相同输入，相同输出。**

---

## 可以构建什么

下面每个示例都是 [`examples/`](../../examples/) 中真实、可运行的 playbook。

### Software

| 示例                                             | 说明                                              |
| ------------------------------------------------ | ------------------------------------------------- |
| [`fullstack-app`](../../examples/fullstack-app/) | 使用 Seed 动态生成 backend + frontend，并通过测试 |
| [`flutter-app`](../../examples/flutter-app/)     | 用 Flutter / Dart 自动生成移动应用                |
| [`baby-app`](../../examples/baby-app/)           | 最小 full-stack 模板；clone、编辑、运行           |

### Research

| 示例                                                         | 说明                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [`deep-research`](../../examples/deep-research/)             | 分层 iterative deepening，并用质量 gate 控制推进                                         |
| [`scientific-research`](../../examples/scientific-research/) | Bayesian reasoning、GRADE evidence、meta-analysis、paper generation — 8-phase epoch loop |
| [`frontier-research`](../../examples/frontier-research/)     | 针对快速变化技术领域的多来源综合                                                         |

### Creative

| 示例                                                                       | 说明                                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`cinematic-video-production`](../../examples/cinematic-video-production/) | 端到端 AI 电影导演。`idea.md` → `clips/`，包含 locked elements + compositing      |
| [`game-assets-video`](../../examples/game-assets-video/)                   | Platformer asset pack — 角色、props、tilesheets、parallax — 从一个 `idea.md` 生成 |
| [`social-sim`](../../examples/social-sim/)                                 | 基于 loop 的社会模拟，每个 tick 生成子任务                                        |

### Security

| 示例                                                       | 说明                                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`autonomous-pentest`](../../examples/autonomous-pentest/) | ~250-task pentest sweep。Findings 必须由可复现 PoC gate。需要 `scope.yml`。**仅限授权使用。** |

### Ops & data

| 示例                                                                     | 说明                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`data-pipeline`](../../examples/data-pipeline/)                         | 顺序 pipeline：fetch → transform → validate                                         |
| [`financial-deep-research`](../../examples/financial-deep-research/)     | 多 phase 股票研究 pipeline，包含逐 ticker 分析和汇总报告                            |
| [`evolutionary-optimization`](../../examples/evolutionary-optimization/) | 用于 prompt tuning、hyperparameter sweeps、copy testing 的 fitness-landscape search |

[浏览所有示例 →](../../examples/)

---

## Playbook 结构

Playbook 是磁盘上的任务树。每个 TASK.md 声明它会产生什么，以及哪些 shell command 用来检查它是否完成。没有集中式 wiring。

```
.converge/playbooks/{name}/
├── playbook.yml              # entry: name, run config, task paths
└── tasks/
    ├── 01-analyze/
    │   ├── TASK.md
    │   └── tasks/
    │       ├── 01a-extract/TASK.md    # frontmatter (depends_on, outputs, checks)
    │       └── 01b-fingerprint/TASK.md
    ├── 02-catalog/TASK.md
    └── 03-build/
        ├── TASK.md
        └── tasks/
            ├── 03a-backend/TASK.md
            └── 03b-frontend/TASK.md
```

执行循环 — diverge, execute, converge:

```
  DIVERGE ──→ EXECUTE ──→ CONVERGE
  seed runs   children     body reads outputs,
  spawns      produce      integrates, validates
  children    outputs      → 0 gaps = done
```

Runtime 按拓扑层遍历 DAG。每个 node 要么执行（AI agent + shell checks），要么缓存（fingerprint 与上次运行相比未变化）。失败的 node 会重试到 attempt 上限；downstream node 会等待依赖完成。类似 dbt 的 `run`：确定性顺序、增量缓存、无循环。

---

## 快速开始

> ⚠️ **Token 消耗警告：** Converge 会调度调用 LLM APIs 的 AI agent。一个 playbook 可能消耗数千万 token。请使用便宜模型 — 见下方 [Provider 设置](#provider-设置)。

### 1. 安装

```bash
npm install -g @converge/core
```

### 2. 初始化项目

```bash
converge init --name=my-project
```

### 3. 创建 playbook

```bash
# Start from a built-in example (no AI needed)
converge add --from-example hello-world

# Or generate one from a prompt (requires AI config)
converge add --from-prompt "Literature review on in-context learning"
```

### 4. 运行

```bash
converge run
```

就是这样。五分钟 walkthrough：**[Your first playbook](../../docs/getting-started/your-first-playbook.md)**。

---

## 为什么选择 Converge

**Checks，而不是感觉。** 每个 task 都声明 shell-command checks — `tsc`、`grep`、`eslint`、test suite。Runtime 会循环直到它们通过。不让 LLM 判断自己的输出。

**Fingerprint caching，而不是 checkpoint files。** 每个 node 都有 SHA-256 fingerprint。未变化的 node 会跳过执行 — 类似 dbt 的 incremental models。在 node 47 停止；重新运行会从已完成内容继续。

**Playbooks，而不是 prompts。** Chat transcript 会随 session 消失。Playbook 是纳入版本控制的 TASK.md 文件。相同输入、相同输出、每次运行一致。团队任何人都可以重新运行。

**DAG，而不是 context window。** 聊天窗口做几个 feature 后就耗尽。Playbook DAG 把工作拆成独立 TASK.md 文件 — 每个都能放进一个窗口。Runtime 按拓扑顺序连接它们。670 个 task，零上下文丢失。

**切换 providers，而不是重写 workflows。** Claude、Gemini、Kimi、Qwen、Codex — 改一个 config，同一个 playbook 继续运行。Stub mode 用于零成本离线开发。

**动态 scope，而不是静态 wiring。** 任务现在可以通过当前的 CLI seed 契约（`seed: { mode: cli }` 加上 `converge spawn ...`）在 runtime 扩展工作，所以一个 scene 会变成一个 task，一个股票 ticker 会变成一个分析分支。DAG 会随着问题本身增长，而不是被模板限制。

---

## Provider 设置

Converge 可运行在任意 LLM 上。它支持两个 agent backend — **Claude Code** (`provider: claude`) 和 **OpenAI Codex** (`provider: codex`) — 每个 backend 都会路由到你选择的模型。Backend 在 `.converge/project.yaml` 中配置。**开发时请使用便宜模型** — Claude Opus 每 1M token 价格为 $15/$75；便宜模型低于 $1/$3。

### 推荐便宜模型

| Model                 | Input / 1M | Output / 1M | 最适合                  |
| --------------------- | ---------- | ----------- | ----------------------- |
| `deepseek-v4-flash`   | $0.27      | $1.10       | Sub-agents、快速 checks |
| `deepseek-v4-pro[1m]` | $0.55      | $2.19       | 主推理                  |
| `MiniMax-M2.7`        | $0.50      | $1.50       | 价格/性能平衡           |
| Claude Opus 4.5       | $15.00     | $75.00      | 最高质量（昂贵）        |

### `.converge/project.yaml` 示例

```yaml
# .converge/project.yaml
name: my-project

ai:
  default: claude
  providers:
    # ── Claude Code backend ──────────────────────────
    claude:
      provider: claude
      env:
        # Route through DeepSeek (cheap)
        ANTHROPIC_BASE_URL: https://api.deepseek.com/anthropic
        ANTHROPIC_AUTH_TOKEN: "${DEEPSEEK_API_KEY}"
        ANTHROPIC_MODEL: deepseek-v4-pro[1m]
        ANTHROPIC_DEFAULT_HAIKU_MODEL: deepseek-v4-flash
        CLAUDE_CODE_SUBAGENT_MODEL: deepseek-v4-flash

        # Or route through MiniMax-M2.7 (uncomment to use)
        # ANTHROPIC_BASE_URL: "https://api.minimax.io/anthropic"
        # ANTHROPIC_AUTH_TOKEN: "${MINIMAX_API_KEY}"
        # ANTHROPIC_MODEL: "MiniMax-M2.7"

    # ── Codex backend ────────────────────────────────
    codex:
      provider: codex
      env:
        CODEX_API_KEY: "${CODEX_API_KEY}"
        # Or set OPENAI_API_KEY instead
```

**Claude Code** 通过 `claude` CLI 运行 — 在环境中设置 `DEEPSEEK_API_KEY` 或 `MINIMAX_API_KEY`。**Codex** 通过 `codex` CLI 运行（`npm i -g @openai/codex`）— 设置 `CODEX_API_KEY` 或 `OPENAI_API_KEY`。Converge 会自动解析 `${VAR}` 引用。`converge init` 会为你 scaffold 这个文件。

完整指南：[Switching providers](../../docs/guides/switch-providers.md)。

---

## Claude Code & Codex 集成

Converge 自带两个 **skills**，可以接入你的 coding agent，让你无需离开 terminal 就能设计和运行 playbook：

| Skill               | 作用                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `converge-planning` | 从 prompt 设计新 playbook — 生成 PLAN.md、TASK.md 文件、dependency graph 和 shell-level checks |
| `converge-control`  | 运行并监控 playbook — 分类 DAG events、诊断失败、增量 re-run                                   |

### 端到端流程

```bash
# 1. Bootstrap a project with skills installed
converge init --name=my-project --skills

# 2. In Claude Code, design the playbook
/converge-planning   # "Build a REST API for user management with auth"

# 3. Run
converge run

# 4. Hand off to converge-control — it monitors, diagnoses, and re-runs on failure
/converge-control    # run → monitor → retry failures
```

### 工作方式

- `converge init --skills` 会把两个 skills 安装到 `.claude/skills/` 和 `.codex/skills/`
- **Claude Code** 和 **Codex** 会从这些目录自动发现 skills — 无需配置
- 输入 `/skill-name` 调用：skill 会加载完整 reference docs（CLI commands、event catalog、troubleshooting recipes），并以完整上下文运行
- `converge-planning` 处理前期设计阶段；`converge-control` 在执行期间接手 — 二者被设计成可以相互 hand off

### 安装 skills 到已有项目

```bash
converge skills install                    # default: .claude/skills/
converge skills install --target .codex/skills
```

---

## 包

| 包                                           | Path                                    | 用途                                                                                              |
| -------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [`@converge/core`](../../packages/core/)     | `packages/core/`                        | 纯 TypeScript engine：runner registry、task graph、state machine、repair strategies。无 UI 依赖。 |
| [`@converge/cli`](../../packages/cli/)       | `packages/cli/`                         | Terminal CLI。Bootstrap、run、watch、tail。通过 provider backends 驱动 runs。                     |
| [`@converge/studio`](../../packages/studio/) | `packages/studio/`                      | 用于可视化 runs、检查 tasks、浏览 journals 的 Web UI。                                            |
| Provider packs                               | `packages/{claude,gemini,kimi,qwen}fn/` | Provider-specific backends。不改变 playbooks 即可切换。                                           |

---

## Dogfood

这个 repo 的重要部分由 Converge 对自身运行 playbooks 构建而成 — CLI redesign（63 tasks）、landing page（65 tasks）、docs generation 等。[查看证据 →](../../.converge/playbooks/)。如果 runtime 不能工作，这个 README 就只能手写。

> **`v0.1.0` · public preview** — Runtime 已发布。包含 **12 个可运行示例 playbook**，覆盖软件、研究、模拟与 provider 集成。后续还会继续增加。

---

## 翻译

- [Tiếng Việt](../vi/README.md)
- [Español](../es/README.md)
- [Português do Brasil](../pt-BR/README.md)
- [简体中文](../zh-CN/README.md)
- [日本語](../ja/README.md)

---

## 社区

- **[Discussions](https://github.com/myanlabs/converge/discussions)** — 问题、想法、playbook patterns
- **[Issues](https://github.com/myanlabs/converge/issues)** — bug reports、feature requests
- **[Contributing](../../CONTRIBUTING.md)** — dev setup、project structure、如何提交 PR

---

## 许可证

MIT — 见 [LICENSE](../../LICENSE)

<div align="center">

**自主 · 可重复 · 可验证**

</div>
