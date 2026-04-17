---
name: docker
version: 1.0.0
description: Docker build verification and deploy task type
---

# docker

Adds Docker build and run verification checks and a `deploy` task type.

## Checks

- **docker-build** — Builds an image from the configured Dockerfile.
- **docker-run** — Starts the image and verifies it boots cleanly.

## Task Types

- **deploy** — Deployment tasks. Default skill: `deploy-agent`, checks: `['docker-build']`.

## Options

| Option       | Default        | Description                |
|--------------|----------------|----------------------------|
| `dockerfile` | `"Dockerfile"` | Path to Dockerfile         |
| `registry`   | —              | Container registry URL     |
| `imageName`  | `"app"`        | Image name for tagging     |
