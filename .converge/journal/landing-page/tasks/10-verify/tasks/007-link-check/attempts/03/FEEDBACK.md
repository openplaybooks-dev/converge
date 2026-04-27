# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **link-check**

## ❌ link-check

**Command**: `test -d apps/landing/dist && (pnpm --filter @converge/landing exec lychee --no-progress --offline ./dist 2>&1 || pnpm --filter @converge/landing exec linkinator ./dist --recurse --silent 2>&1)`
**Exit code**: 1
**Output**:
```
packages/studio                          |  WARN  The field "pnpm.onlyBuiltDependencies" was found in /Users/minh/Documents/converge/packages/studio/package.json. This will not take effect. You should configure "pnpm.onlyBuiltDependencies" at the root of the workspace instead.
undefined
/Users/minh/Documents/converge/apps/landing:
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "lychee" not found
packages/studio                          |  WARN  The field "pnpm.onlyBuiltDependencies" was found in /Users/minh/Documents/converge/packages/studio/package.json. This will not take effect. You should configure "pnpm.onlyBuiltDependencies" at the root of the workspace instead.
→ crawling ./dist
[404] dist/getting-started/why-converge/install
[404] dist/getting-started/guides/switch-providers.md
[404] dist/docs/examples/
[404] dist/docs/examples/learning/hello-world
[404] dist/docs/examples/software/fullstack-app
[404] dist/docs/examples/software/stitch-to-flutter
[404] dist/docs/examples/creative/cinematic-video-production
[404] dist/docs/examples/social-sim
[404] dist/docs/examples/security/autonomous-pentest
[404] dist/getting-started/readme/why-converge.md
[404] dist/examples/readme/learning/hello-world
[404] dist/examples/readme/learning/data-pipeline
[404] dist/examples/readme/software/baby-app
[404] dist/reference/cli/run
[404] dist/troubleshooting/typecheck-errors-in-vendored-code
[404] dist/troubleshooting/mixed-shape-task
[404] dist/examples/
[404] dist/guides/readme/articulate-your-goal.md
[404] dist/guides/readme/generate-something-repeatedly.md
[404] dist/guides/readme/research-a-topic-deeply.md
[404] dist/guides/readme/build-a-software-project.md
[404] dist/guides/readme/switch-providers.md
[404] dist/guides/readme/read-the-journal.md
[404] dist/guides/readme/customize-an-example.md
[404] dist/docs/reference/
[404] dist/docs/troubleshooting/
[404] dist/troubleshooting/previous-session-cancelled
[404] dist/troubleshooting/iteration-cap-reached
[404] dist/troubleshooting/stale-outputs-paths
[404] dist/troubleshooting/stale-inputs
[404] dist/troubleshooting/missing-wbs-sub-template
[404] dist/troubleshooting/foreign-playbook-hijacks
[404] dist/troubleshooting/wbs-self-test-fail
[404] dist/docs/examples/
[404] dist/reference/readme/playbook-yml.md
[404] dist/reference/readme/task-md.md
[404] dist/reference/readme/project-yml.md
[404] dist/reference/readme/core-api.md
[404] dist/reference/readme/cli/
[404] dist/reference/guides/
[404] dist/reference/concepts/
[404] dist/reference/cli/index.md
[404] dist/docs/examples/
[404] dist/docs/getting-started/why-converge/install
[404] dist/docs/getting-started/why-converge/install
[404] dist/docs/examples/
[404] dist/docs/examples/
[404] dist/docs/examples/
[404] dist/docs/examples/
[404] dist/docs/examples/
[404] dist/docs/examples/research/deep-research
[404] dist/docs/examples/
[404] dist/docs/examples/learning/hello-world
[404] dist/docs/examples/research/deep-research
[404] dist/docs/examples/software/fullstack-app
[404] dist/docs/examples/software/stitch-to-flutter
[404] dist/docs/examples/creative/cinematic-video-production
[404] dist/docs/examples/social-sim
[404] dist/docs/examples/security/autonomous-pentest
[404] dist/concepts/readme/context-interpolation.md
[404] dist/concepts/readme/deterministic-checks.md
[404] dist/concepts/readme/dynamic-work-breakdown.md
[404] dist/concepts/readme/self-correction.md
[404] dist/concepts/guides/
[404] dist/concepts/reference/
[404] dist/docs/examples/agent-protocol/acp-demo
[404] dist/docs/examples/agent-protocol/acp-demo
[404] dist/troubleshooting/mixed-shape-task
[404] dist/troubleshooting/
[404] dist/troubleshooting/
[404] dist/troubleshooting/
[404] dist/troubleshooting/
[404] dist/troubleshooting/
[404] dist/troubleshooting/
[404] dist/reference/
[404] dist/docs/examples/
[404] dist/docs/concepts/
[404] dist/getting-started/readme/install.md
[404] dist/getting-started/readme/from-problem-to-playbook.md
[404] dist/troubleshooting/
[404] dist/getting-started/readme/your-first-playbook.md
[404] dist/docs/examples/
[404] dist/examples/
[404] dist/getting-started/examples/
[404] dist/getting-started/readme/next-steps.md
[404] dist/getting-started/concepts/
[404] dist/getting-started/guides/
[404] dist/examples/readme/software/flutter-app
[404] dist/examples/readme/software/game-aiwolf
[404] dist/examples/readme/software/fullstack-app
[404] dist/examples/readme/software/stitch-to-flutter
[404] dist/examples/readme/software/game-assets
[404] dist/examples/readme/software/stitch-to-flutter-baby-watch-v2
[404] dist/examples/readme/software/stitch-to-flutter-baby-watch
[404] dist/examples/readme/research/deep-research
[404] dist/troubleshooting/typecheck-errors-in-vendored-code
[404] dist/troubleshooting/mixed-shape-task
[404] dist/docs/examples/
[404] dist/examples/readme/research/frontier-research
[404] dist/examples/readme/creative/evolutionary-optimization
[404] dist/examples/readme/creative/cinematic-video-production
[404] dist/examples/readme/creative/social-sim
[404] dist/getting-started/guides/switch-providers.md
[404] dist/examples/readme/security/autonomous-pentest
[404] dist/examples/readme/agent-protocol/acp-demo
[404] dist/examples/getting-started/from-problem-to-playbook
[404] dist/troubleshooting/wbs-children-not-seen
[404] dist/troubleshooting/secondary-playbook-fails
[404] dist/troubleshooting/parent-stays-seeded
[404] dist/troubleshooting/vendored-type-errors
[404] dist/troubleshooting/e2e-in-ai-spawn
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://github.com/myanlabs/converge
[404] https://converge.dev/getting-started/why-converge/
[404] https://converge.dev/guides/readme/
[404] https://converge.dev/concepts/context-interpolation/
[404] https://converge.dev/guides/read-the-journal/
[404] https://converge.dev/guides/read-the-journal/
[404] https://converge.dev/getting-started/install/
[404] https://converge.dev/getting-started/install/
[404] https://converge.dev/guides/generate-something-repeatedly/
[404] https://converge.dev/getting-started/from-problem-to-playbook/
[404] https://converge.dev/getting-started/from-problem-to-playbook/
[404] https://converge.dev/concepts/deterministic-checks/
[404] https://converge.dev/concepts/deterministic-checks/
[404] https://converge.dev/guides/articulate-your-goal/
[404] https://converge.dev/guides/switch-providers/
[404] https://converge.dev/guides/switch-providers/
[404] https://converge.dev/reference/readme/
[404] https://converge.dev/og/home.png
[404] https://converge.dev/og/blog.png
[404] https://converge.dev/og/blog.png
[404] https://converge.dev/og/blog.png
[404] https://converge.dev/guides/research-a-topic-deeply/
[404] https://converge.dev/guides/research-a-topic-deeply/
[404] https://converge.dev/reference/project-yml/
[404] https://converge.dev/blog/
[404] https://converge.dev/getting-started/readme/
[404] https://converge.dev/concepts/readme/
[404] https://converge.dev/reference/core-api/
[404] https://converge.dev/reference/cli/
[404] https://converge.dev/getting-started/your-first-playbook/
[404] https://converge.dev/concepts/dynamic-work-breakdown/
[404] https://converge.dev/concepts/dynamic-work-breakdown/
[404] https://converge.dev/getting-started/next-steps/
[404] https://converge.dev/blog/from-langgraph-to-goal-driven/
[404] https://converge.dev/docs/getting-started/your-first-playbook/
[404] https://converge.dev/docs/getting-started/your-first-playbook/
[404] https://converge.dev/docs/getting-started/why-converge/
[404] https://converge.dev/docs/getting-started/why-converge/
[404] https://converge.dev/reference/playbook-yml/
[404] https://converge.dev/reference/playbook-yml/
[404] https://converge.dev/examples/readme/
[404] https://converge.dev/reference/task-md/
[404] https://converge.dev/reference/task-md/
[404] https://converge.dev/blog/introducing-converge/
[404] https://converge.dev/guides/build-a-software-project/
[404] https://converge.dev/guides/build-a-software-project/
[404] https://converge.dev/guides/customize-an-example/
[404] https://converge.dev/guides/customize-an-example/
[404] https://converge.dev/troubleshooting/readme/
[404] https://converge.dev/concepts/self-correction/
dist
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/og/home.png
dist/docs/getting-started/why-converge
  [404] dist/docs/getting-started/why-converge/install
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/docs/getting-started/why-converge/
dist/getting-started/why-converge/
  [404] dist/getting-started/why-converge/install
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/getting-started/why-converge/
dist/getting-started/install/
  [404] dist/getting-started/guides/switch-providers.md
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/getting-started/install/
dist/blog
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/og/blog.png
  [404] https://converge.dev/blog/
dist/getting-started/from-problem-to-playbook/
  [404] dist/docs/examples/
  [404] dist/docs/examples/learning/hello-world
  [404] dist/docs/examples/software/fullstack-app
  [404] dist/docs/examples/software/stitch-to-flutter
  [404] dist/docs/examples/creative/cinematic-video-production
  [404] dist/docs/examples/social-sim
  [404] dist/docs/examples/security/autonomous-pentest
  [404] dist/docs/examples/research/deep-research
  [404] dist/docs/examples/agent-protocol/acp-demo
  [404] dist/troubleshooting/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/getting-started/from-problem-to-playbook/
dist/getting-started/readme/
  [404] dist/getting-started/readme/why-converge.md
  [404] dist/getting-started/readme/install.md
  [404] dist/getting-started/readme/from-problem-to-playbook.md
  [404] dist/getting-started/readme/your-first-playbook.md
  [404] dist/getting-started/examples/
  [404] dist/getting-started/readme/next-steps.md
  [404] dist/getting-started/concepts/
  [404] dist/getting-started/guides/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/getting-started/readme/
dist/examples/readme/
  [404] dist/examples/readme/learning/hello-world
  [404] dist/examples/readme/learning/data-pipeline
  [404] dist/examples/readme/software/baby-app
  [404] dist/examples/readme/software/flutter-app
  [404] dist/examples/readme/software/game-aiwolf
  [404] dist/examples/readme/software/fullstack-app
  [404] dist/examples/readme/software/stitch-to-flutter
  [404] dist/examples/readme/software/game-assets
  [404] dist/examples/readme/software/stitch-to-flutter-baby-watch-v2
  [404] dist/examples/readme/software/stitch-to-flutter-baby-watch
  [404] dist/examples/readme/research/deep-research
  [404] dist/examples/readme/research/frontier-research
  [404] dist/examples/readme/creative/evolutionary-optimization
  [404] dist/examples/readme/creative/cinematic-video-production
  [404] dist/examples/readme/creative/social-sim
  [404] dist/examples/readme/security/autonomous-pentest
  [404] dist/examples/readme/agent-protocol/acp-demo
  [404] dist/examples/getting-started/from-problem-to-playbook
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/examples/readme/
dist/guides/generate-something-repeatedly/
  [404] dist/reference/cli/run
  [404] dist/docs/examples/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/generate-something-repeatedly/
dist/guides/build-a-software-project/
  [404] dist/troubleshooting/typecheck-errors-in-vendored-code
  [404] dist/troubleshooting/mixed-shape-task
  [404] dist/docs/examples/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/build-a-software-project/
dist/guides/research-a-topic-deeply/
  [404] dist/examples/
  [404] dist/docs/examples/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/research-a-topic-deeply/
dist/getting-started/next-steps/
  [404] dist/docs/examples/
  [404] dist/troubleshooting/
  [404] dist/reference/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/getting-started/next-steps/
dist/guides/readme/
  [404] dist/guides/readme/articulate-your-goal.md
  [404] dist/guides/readme/generate-something-repeatedly.md
  [404] dist/guides/readme/research-a-topic-deeply.md
  [404] dist/guides/readme/build-a-software-project.md
  [404] dist/guides/readme/switch-providers.md
  [404] dist/guides/readme/read-the-journal.md
  [404] dist/guides/readme/customize-an-example.md
  [404] dist/docs/reference/
  [404] dist/docs/troubleshooting/
  [404] dist/docs/examples/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/readme/
dist/troubleshooting/readme/
  [404] dist/troubleshooting/previous-session-cancelled
  [404] dist/troubleshooting/iteration-cap-reached
  [404] dist/troubleshooting/stale-outputs-paths
  [404] dist/troubleshooting/stale-inputs
  [404] dist/troubleshooting/missing-wbs-sub-template
  [404] dist/troubleshooting/foreign-playbook-hijacks
  [404] dist/troubleshooting/wbs-self-test-fail
  [404] dist/troubleshooting/mixed-shape-task
  [404] dist/troubleshooting/wbs-children-not-seen
  [404] dist/troubleshooting/secondary-playbook-fails
  [404] dist/troubleshooting/parent-stays-seeded
  [404] dist/troubleshooting/vendored-type-errors
  [404] dist/troubleshooting/e2e-in-ai-spawn
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/troubleshooting/readme/
dist/reference/task-md
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/reference/task-md/
dist/guides/switch-providers/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/switch-providers/
dist/reference/readme/
  [404] dist/reference/readme/playbook-yml.md
  [404] dist/reference/readme/task-md.md
  [404] dist/reference/readme/project-yml.md
  [404] dist/reference/readme/core-api.md
  [404] dist/reference/readme/cli/
  [404] dist/reference/guides/
  [404] dist/reference/concepts/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/reference/readme/
dist/reference/core-api/
  [404] dist/reference/cli/index.md
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/reference/core-api/
dist/guides/articulate-your-goal/
  [404] dist/docs/examples/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/articulate-your-goal/
dist/docs/getting-started/why-converge/
  [404] dist/docs/getting-started/why-converge/install
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/docs/getting-started/why-converge/
dist/guides/customize-an-example/
  [404] dist/docs/examples/
  [404] dist/troubleshooting/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/customize-an-example/
dist/getting-started/from-problem-to-playbook
  [404] dist/docs/examples/
  [404] dist/docs/examples/learning/hello-world
  [404] dist/docs/examples/research/deep-research
  [404] dist/docs/examples/software/fullstack-app
  [404] dist/docs/examples/software/stitch-to-flutter
  [404] dist/docs/examples/creative/cinematic-video-production
  [404] dist/docs/examples/social-sim
  [404] dist/docs/examples/security/autonomous-pentest
  [404] dist/docs/examples/agent-protocol/acp-demo
  [404] dist/troubleshooting/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/getting-started/from-problem-to-playbook/
dist/concepts/readme/
  [404] dist/concepts/readme/context-interpolation.md
  [404] dist/concepts/readme/deterministic-checks.md
  [404] dist/concepts/readme/dynamic-work-breakdown.md
  [404] dist/concepts/readme/self-correction.md
  [404] dist/concepts/guides/
  [404] dist/concepts/reference/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/concepts/readme/
dist/guides/read-the-journal/
  [404] dist/troubleshooting/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/read-the-journal/
dist/guides/customize-an-example
  [404] dist/troubleshooting/
  [404] dist/docs/examples/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/customize-an-example/
dist/blog/introducing-converge
  [404] dist/docs/concepts/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/og/blog.png
  [404] https://converge.dev/blog/introducing-converge/
dist/guides/read-the-journal
  [404] dist/troubleshooting/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/read-the-journal/
dist/guides/research-a-topic-deeply
  [404] dist/docs/examples/
  [404] dist/examples/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/research-a-topic-deeply/
dist/docs/getting-started/your-first-playbook
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/docs/getting-started/your-first-playbook/
dist/guides/build-a-software-project
  [404] dist/troubleshooting/typecheck-errors-in-vendored-code
  [404] dist/troubleshooting/mixed-shape-task
  [404] dist/docs/examples/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/build-a-software-project/
dist/getting-started/install
  [404] dist/getting-started/guides/switch-providers.md
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/getting-started/install/
dist/getting-started/your-first-playbook/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/getting-started/your-first-playbook/
dist/blog/from-langgraph-to-goal-driven
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/og/blog.png
  [404] https://converge.dev/blog/from-langgraph-to-goal-driven/
dist/reference/playbook-yml/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/reference/playbook-yml/
dist/reference/cli/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/reference/cli/
dist/concepts/dynamic-work-breakdown
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/concepts/dynamic-work-breakdown/
dist/reference/project-yml/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/reference/project-yml/
dist/reference/task-md/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/reference/task-md/
dist/concepts/deterministic-checks/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/concepts/deterministic-checks/
dist/concepts/dynamic-work-breakdown/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/concepts/dynamic-work-breakdown/
dist/concepts/context-interpolation/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/concepts/context-interpolation/
dist/concepts/self-correction/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/concepts/self-correction/
dist/reference/playbook-yml
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/reference/playbook-yml/
dist/concepts/deterministic-checks
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/concepts/deterministic-checks/
dist/guides/switch-providers
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/guides/switch-providers/
dist/docs/getting-started/your-first-playbook/
  [404] https://github.com/myanlabs/converge
  [404] https://converge.dev/docs/getting-started/your-first-playbook/
ERROR: Detected 206 broken links. Scanned 264 links in 3.036 seconds.
undefined
/Users/minh/Documents/converge/apps/landing:
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command failed with exit code 1: linkinator ./dist --recurse --silent
```

> **BROKEN COMMAND** — The check command itself cannot run.
> This is NOT a code problem. Fix the `cmd` in the source TASK.md
> (in `.converge/epics/`). Look for the check with id `link-check`.
> Replace absolute/platform-specific paths with portable commands.
> Example: `grep -q "pattern" "file.tsx"`
