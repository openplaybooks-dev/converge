---
title: Frontend shell, routing, and layout
---

# Frontend shell, routing, and layout

**Goal**: Implement the frontend application skeleton — app shell, navigation, routing slots for every CLI command, shared UI primitives, and the API client to the backend.

## Scope

Per ARCHITECTURE.md, build the frontend package. The recursive planner for this node will decide its child layer (project scaffold, layout/nav, router with placeholder routes for every command, API client, shared primitives). The router MUST register a route per `cli-commands.json[].name` so `05-command-views` can fill placeholder slots without re-touching navigation. Must publish a "route registry" (path TBD by its planner) so the wbs children know which slot to populate.

## Decomposition

This task decomposes further. Run `converge plan` at this path to plan its layer.
