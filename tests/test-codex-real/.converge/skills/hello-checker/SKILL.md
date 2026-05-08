---
name: hello-checker
description: Use this skill when asked to "verify", "check", or "validate" a file's existence and content. It provides a reliable workflow for confirming files meet their spec.
---

## Purpose

Verify that a specified file exists at the expected path and contains the expected content.

## Workflow

1. Read the file at the path the user specifies.
2. Compare its contents against the expected value.
3. Report whether the file exists, whether the content matches, and what was found.
4. Write the verification result to `SKILL_LOADED.txt` with the outcome (PASS or FAIL) and the actual content found.
