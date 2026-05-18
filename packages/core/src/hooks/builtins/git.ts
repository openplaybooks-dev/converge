/**
 * Built-in Git Hook Factories
 *
 * Pre-built hook executors for common git automation patterns:
 * auto-commit on task completion and PR creation.
 *
 * @example
 * ```ts
 * import { hookDef } from '@openplaybooks/converge-core';
 * import { gitCommitHook, prCreateHook } from '@openplaybooks/converge-core/hooks/builtins';
 *
 * hookDef()
 *   .id('git-automation')
 *   .on('task:complete')
 *   .filterTags(['code'])
 *   .fn(gitCommitHook({ messageTemplate: 'feat: {taskTitle}' }))
 *   .build();
 * ```
 */

import type { HookExecutorFn } from "../hook-definition.ts";

/* ------------------------------------------------------------------ */
/*  Config types                                                       */
/* ------------------------------------------------------------------ */

export interface GitCommitHookConfig {
  /**
   * Commit message template.
   * Supports: {taskId}, {taskTitle}, {hookId}, {timestamp}
   * Default: "converge: auto-commit [{taskId}] {taskTitle}"
   */
  messageTemplate?: string;
  /** Skip commit when working tree is clean. Default: true. */
  skipClean?: boolean;
}

export interface PrCreateHookConfig {
  /** Create PR as draft. Default: true. */
  draft?: boolean;
  /** Labels to apply (comma-separated for gh CLI). Default: ["converge"] */
  labels?: string[];
  /**
   * PR title template.
   * Supports: {taskId}, {taskTitle}, {branchName}, {timestamp}
   * Default: "Converge: automated changes from {branchName}"
   */
  titleTemplate?: string;
  /**
   * PR body template.
   * Supports: {taskId}, {taskTitle}, {branchName}, {timestamp}
   * Default: "Automated PR created by Converge hook."
   */
  bodyTemplate?: string;
  /** Base branch for PR. Default: auto-detected from git remote. */
  baseBranch?: string;
}

/* ------------------------------------------------------------------ */
/*  Template substitution                                              */
/* ------------------------------------------------------------------ */

function applyTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  gitCommitHook                                                       */
/* ------------------------------------------------------------------ */

/**
 * Create a hook executor that auto-commits changes after a task completes.
 *
 * @example
 * ```ts
 * .fn(gitCommitHook({ messageTemplate: 'feat({taskId}): {taskTitle}' }))
 * ```
 */
export function gitCommitHook(config: GitCommitHookConfig = {}): HookExecutorFn {
  const {
    messageTemplate = "converge: auto-commit [{taskId}] {taskTitle}",
    skipClean = true,
  } = config;

  return async (ctx) => {
    try {
      if (skipClean) {
        const status = await ctx.shell("git status --porcelain");
        if (!status.stdout.trim()) {
          ctx.log.info(`Working tree clean — skipping commit.`);
          return;
        }
      }

      await ctx.shell("git add -A");

      const message = applyTemplate(messageTemplate, {
        taskId: ctx.taskId,
        taskTitle: ctx.taskTitle,
        hookId: ctx.hookId,
        timestamp: new Date().toISOString(),
      });

      const result = await ctx.shell(
        `git commit -m "${message.replace(/"/g, '\\"')}"`,
      );

      if (result.exitCode !== 0) {
        ctx.log.error(`Git commit failed: ${result.stderr}`);
      } else {
        ctx.log.info(`Committed: ${message}`);
      }
    } catch (err: any) {
      ctx.log.error(`Git commit error: ${err?.message ?? err}`);
    }
  };
}

/* ------------------------------------------------------------------ */
/*  prCreateHook                                                        */
/* ------------------------------------------------------------------ */

/**
 * Create a hook executor that opens a PR via `gh pr create`.
 *
 * The PR is created only once (tracked via closure). Requires `gh` CLI
 * to be installed and authenticated.
 *
 * @example
 * ```ts
 * .fn(prCreateHook({ draft: true, labels: ['auto-generated'] }))
 * ```
 */
export function prCreateHook(config: PrCreateHookConfig = {}): HookExecutorFn {
  const {
    draft = true,
    labels = ["converge"],
    titleTemplate = "Converge: automated changes from {branchName}",
    bodyTemplate = "Automated PR created by Converge hook.\n\nChanges from: {taskTitle} ({taskId})",
    baseBranch,
  } = config;

  let prCreated = false;

  return async (ctx) => {
    if (prCreated) {
      ctx.log.info("PR already created — skipping.");
      return;
    }

    try {
      // Check gh CLI availability
      const ghCheck = await ctx.shell("which gh");
      if (ghCheck.exitCode !== 0) {
        ctx.log.warn("gh CLI not found — skipping PR creation.");
        return;
      }

      const branchResult = await ctx.shell("git branch --show-current");
      const branchName = branchResult.stdout.trim();
      if (!branchName) {
        ctx.log.error("Could not determine current branch.");
        return;
      }

      const base = baseBranch || "main";
      const title = applyTemplate(titleTemplate, {
        taskId: ctx.taskId,
        taskTitle: ctx.taskTitle,
        hookId: ctx.hookId,
        branchName,
        timestamp: new Date().toISOString(),
      });
      const body = applyTemplate(bodyTemplate, {
        taskId: ctx.taskId,
        taskTitle: ctx.taskTitle,
        hookId: ctx.hookId,
        branchName,
        timestamp: new Date().toISOString(),
      });

      const flags = [
        draft ? "--draft" : "",
        `--title "${title.replace(/"/g, '\\"')}"`,
        `--body "${body.replace(/"/g, '\\"')}"`,
        `--base "${base}"`,
        labels.length > 0 ? `--label "${labels.join(',')}"` : "",
      ]
        .filter(Boolean)
        .join(" ");

      const result = await ctx.shell(`gh pr create ${flags}`);

      if (result.exitCode !== 0) {
        ctx.log.error(`PR creation failed: ${result.stderr}`);
      } else {
        prCreated = true;
        ctx.log.info(`PR created: ${result.stdout.trim()}`);
      }
    } catch (err: any) {
      ctx.log.error(`PR creation error: ${err?.message ?? err}`);
    }
  };
}
