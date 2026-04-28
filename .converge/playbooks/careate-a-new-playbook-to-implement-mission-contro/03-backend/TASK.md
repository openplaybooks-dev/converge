---
title: Backend API service
---

# Backend API service

**Goal**: Implement the server that exposes every converge CLI command as an API endpoint with streaming output, plus read endpoints for journals, playbooks, and other on-disk artifacts mission control needs.

## Scope

Per ARCHITECTURE.md, build the backend package. The recursive planner for this node will decide its child layer (server scaffold, generic command-runner, per-domain read endpoints, streaming transport, etc.) using `ARCHITECTURE.md` and `cli-commands.json` as authoritative inputs. Must publish an "endpoint registry" file (path TBD by its planner) so `05-command-views` knows which endpoint to call per command.

## Decomposition

This task decomposes further. Run `converge plan` at this path to plan its layer.
