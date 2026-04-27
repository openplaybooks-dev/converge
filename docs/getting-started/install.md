---
title: "Install"
description: "Install the Converge CLI and verify it runs."
sidebar:
  order: 2
---
## Prerequisites

Node 22 or higher. Verify with:

```bash
node --version
```

## Install

Choose your package manager:

```bash
npm install -g @converge/cli
```

```bash
pnpm add -g @converge/cli
```

```bash
bun add -g @converge/cli
```

## Verify

Confirm the CLI is installed:

```bash
converge --version
```

If installed correctly, you'll see the version number. If you get a "command not found" error, ensure your global `node_modules` bin directory is on your `$PATH`.

## Provider API Key

Converge calls an LLM provider to execute tasks. Set one of:

- `ANTHROPIC_API_KEY` — Anthropic Claude
- `GEMINI_API_KEY` — Google Gemini
- `KIMI_API_KEY` — Moonshot Kimi
- `QWEN_API_KEY` — Alibaba Qwen

Add the relevant variable to your shell profile or environment. The first provider you configure is used by default — you can switch later (see [Switch Providers](../guides/switch-providers.md)).

## Project Install (optional)

To install Converge as a project dependency rather than globally:

```bash
cd my-project
pnpm add -D @converge/cli
```

This lets you run `converge` via `pnpm converge` or through a script in `package.json`.
