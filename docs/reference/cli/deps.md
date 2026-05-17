---
title: "converge deps"
description: "Manage skill dependencies."
sidebar:
  order: 22
---

Manage skill dependencies from the CLI.

`deps` is a small namespace with list/install subcommands for dependency management around skills.

## Usage

```bash
converge deps list [options]
converge deps install [skill] [options]
```

## Subcommands

| Subcommand | Effect |
|---|---|
| `list` | List dependency state. |
| `install` | Install dependencies, optionally targeting one skill. |

## Options

| Flag | Applies to | Effect |
|---|---|---|
| `--target=PATH` | `install` | Override installation target. |
| `--force` | `install` | Force overwrite / reinstall where supported. |
| `--dir=PATH` | both | Project directory. |
| `--verbose` | both | Verbose output. |

## Examples

```bash
converge deps list
converge deps install
converge deps install converge-planning --force
```

Use `converge deps <subcommand> --help` for the canonical argument contract of each subcommand.
