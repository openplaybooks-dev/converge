/**
 * ToolEnvironmentRepairStrategy
 *
 * Detects and repairs issues related to external tools and environment configuration.
 * This strategy handles:
 *   - Broken check commands (exit 127 / command not found) — AI analyzes and provides fix
 *   - External tool output format changes (Stitch CLI, npm, etc.)
 *   - Missing CLI tools or environment dependencies
 *   - Tool version mismatches
 *   - Environment variable configuration issues
 *
 * Use cases:
 *   - Check command fails with "command not found" — AI provides replacement
 *   - External tool updated and changed output format
 *   - Task expects tool that isn't installed
 *   - Tool version incompatibility
 *   - Missing environment variables or configuration
 *
 * Approach:
 *   1. Detect if check command was broken (exit 127) — use AI to heal it
 *   2. Otherwise, analyze task logs for tool invocations and environment issues
 *   3. Create adaptation layer (wrapper scripts, symlinks, config updates)
 *   4. Or provide setup instructions for missing tools
 */

import { z } from 'zod';
import { readdirSync } from 'node:fs';
import type { Gap } from '../../gap/types.ts';
import type { FixStrategy, StrategyContext, StrategyOutcome } from '../types.ts';
import { createAIContext } from '../../ai/context.ts';
import { createFilesystemHelper } from '../helpers/filesystem.ts';
import { createTaskHelper } from '../helpers/task.ts';
import { logTaskEvent } from '../../journal/writer.ts';

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const ToolEnvironmentAnalysisSchema = z.object({
  issueType: z.enum([
    'broken-check-command',
    'tool-format-change',
    'missing-tool',
    'tool-version-mismatch',
    'environment-config',
    'not-applicable',
  ]),
  toolName: z.string().describe('Name of tool or dependency (e.g., "Stitch CLI", "npm", "node")'),
  oldFormat: z.string().optional().describe('Previous output format (for tool-format-change)'),
  newFormat: z.string().optional().describe('Current output format (for tool-format-change)'),
  missingDependency: z.string().optional().describe('What dependency is missing'),
  reasoning: z.string(),
  adaptationStrategy: z.enum([
    'update-check-command',
    'update-expectations',
    'create-symlink',
    'wrapper-script',
    'install-instructions',
    'both',
    'none',
  ]),
  actions: z.array(z.object({
    type: z.enum(['update-skill-md', 'create-symlink', 'create-wrapper', 'log-setup-instructions']),
    details: z.record(z.unknown()),
  })),
});

type ToolEnvironmentAnalysis = z.infer<typeof ToolEnvironmentAnalysisSchema>;

/* ------------------------------------------------------------------ */
/*  ToolEnvironmentRepairStrategy                                    */
/* ------------------------------------------------------------------ */

export class ToolEnvironmentRepairStrategy implements FixStrategy {
  readonly name = 'tool-environment-repair';
  readonly description = 'Detects and repairs external tool/environment configuration issues, including broken check commands via AI healing';
  readonly priority = 8;

  canHandle(gap: Gap): boolean {
    // Handle check-failed gaps
    if (gap.metadata?.gapKind === 'check-failed') {
      // Broken command check (exit 127) — handled by this strategy
      if (gap.metadata?.checkOutput?.includes('command not found') ||
          gap.metadata?.checkOutput?.includes('not found') ||
          gap.metadata?.checkExitCode === 127) {
        return true;
      }
      // Also handle check-failed where task completed (external tool issue)
      if (gap.metadata?.taskCompletedSuccessfully === true) {
        return true;
      }
    }
    return false;
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    console.log(`   🔍 Analyzing for tool/environment issues...`);

    // Check if this is a broken command (exit 127)
    const isBrokenCommand = gap.metadata?.checkOutput?.includes('command not found') ||
                          gap.metadata?.checkOutput?.includes('not found') ||
                          gap.metadata?.checkExitCode === 127;

    if (isBrokenCommand) {
      return await this.fixBrokenCheckCommand(gap, ctx);
    }

    // Otherwise, proceed with normal tool/environment analysis
    return await this.analyzeAndFix(gap, ctx);
  }

  /* ------------------------------------------------------------------ */
  /*  Broken Command Healing                                             */
  /* ------------------------------------------------------------------ */

  /**
   * When a check command is broken (command not found), use AI to analyze
   * and provide a replacement command that achieves the same validation goal.
   */
  private async fixBrokenCheckCommand(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    console.log(`   🔧 Broken check command detected — using AI to heal...`);

    try {
      // Gather context for AI healing
      const checkCmd = gap.metadata?.checkCmd as string;
      const checkDescription = gap.metadata?.checkDescription as string;
      const checkOutput = gap.metadata?.checkOutput as string;

      // Scan project root to give AI context
      let projectFiles = '';
      try {
        const entries = readdirSync(projectDir);
        projectFiles = entries.slice(0, 50).join(', ');
      } catch { /* ignore */ }

      // Create AI context
      const ai = createAIContext(projectDir, journalCtx);

      const prompt = `A check command failed because the binary is not installed on this machine.

**Check Details:**
- Check ID: ${gap.metadata?.checkId || 'unknown'}
- Check Description: ${checkDescription || 'N/A'}
- Failed Command: ${checkCmd}
- Error Output: ${checkOutput}

**Platform:** ${process.platform === 'win32' ? 'Windows (Git Bash)' : process.platform}
**Working directory:** ${projectDir}

**Project files (first 50):** ${projectFiles}

**Your task:** Provide a single replacement command that achieves the SAME validation goal.

**Rules:**
- Command must exit 0 on success, non-zero on failure
- Use node or bash builtins — these are always available
- If the check cannot be replicated simply, use: echo "check skipped" && exit 0
- Return ONLY the single command string — no explanation, no markdown, no backticks

**Examples of valid replacements:**
- \`node -e "require('fs').readFileSync('file','utf8')"\` — file existence via node
- \`grep -q "pattern" file && exit 0 || exit 1\` — pattern match via grep
- \`test -f path && test -d path\` — file/dir check via test builtin
- \`echo "check skipped" && exit 0\` — skip if too complex

Return your replacement command now:`;

      const result = await ai.askString(prompt, {
        phase: 'heal-check',
        label: 'Broken Check Command Healing',
        timeoutMs: 60_000,
      });

      const healedCmd = result.trim().replace(/^`+|`+$/g, '');

      if (!healedCmd || healedCmd.includes('\n') || healedCmd.length > 2000) {
        console.log(`   ⚠️  AI returned invalid response, cannot heal broken command`);
        return {
          success: false,
          reason: 'AI did not provide a valid replacement command',
          shouldRetry: false,
        };
      }

      console.log(`   🤖 AI healed check command: ${healedCmd}`);

      // Update TASK.md with the healed command
      const task = createTaskHelper(projectDir, journalCtx.epicId);
      const skillPath = task.getSkillPath(journalCtx.taskId);
      const filesystem = createFilesystemHelper(projectDir);

      await filesystem.updateSkillMd(skillPath, {
        checks: [{
          id: (gap.metadata?.checkId as string) || 'unknown',
          cmd: healedCmd,
          description: checkDescription,
        }],
      });

      await logTaskEvent(
        projectDir,
        journalCtx.epicId,
        journalCtx.taskId,
        'BROKEN_CHECK_HEALED',
        `Healed broken check command via AI: ${healedCmd}`,
        {
          strategyName: this.name,
          originalCmd: checkCmd,
          healedCmd,
          checkId: gap.metadata?.checkId,
        }
      );

      return {
        success: true,
        reason: `Healed broken check command via AI: ${healedCmd}`,
        retryMode: 'validate',
        metadata: {
          issueType: 'broken-check-command',
          originalCmd: checkCmd,
          healedCmd,
        },
      };
    } catch (err: any) {
      console.error(`   ❌ Broken command healing failed:`, err.message);
      return {
        success: false,
        reason: `Broken command healing failed: ${err.message}`,
        shouldRetry: false,
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Tool/Environment Analysis & Fix                                     */
  /* ------------------------------------------------------------------ */

  private async analyzeAndFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    try {
      // Initialize helpers
      const ai = createAIContext(projectDir, journalCtx);
      const filesystem = createFilesystemHelper(projectDir);
      const task = createTaskHelper(projectDir, journalCtx.epicId);

      // Get task metadata
      const taskId = journalCtx.taskId;
      const taskLogs = await task.getLogTail(taskId, 100);
      const taskDefinition = await task.getDefinition(taskId);

      // Get filesystem state
      const outputDir = gap.metadata?.outputDir as string || '.';
      let filesystemState: string[] = [];
      try {
        filesystemState = await filesystem.listDirectory(outputDir);
      } catch {
        filesystemState = ['<directory not found>'];
      }

      // Analyze for tool/environment issues
      console.log(`   🧠 AI analyzing tool/environment state...`);
      const analysis = await this.analyze(
        gap,
        taskId,
        taskLogs,
        filesystemState,
        taskDefinition,
        ai
      );

      if (analysis.issueType === 'not-applicable') {
        console.log(`   ↩  Not a tool/environment issue: ${analysis.reasoning}`);
        return {
          success: false,
          reason: analysis.reasoning,
          shouldRetry: false,
        };
      }

      // Apply adaptation strategy
      console.log(`   🔧 Issue type: ${analysis.issueType}`);
      console.log(`   🔧 Applying adaptation: ${analysis.adaptationStrategy}`);
      const results: string[] = [];
      const actionTypes = new Set<string>();

      for (const action of analysis.actions) {
        const result = await this.executeAction(action, gap, ctx, filesystem);
        results.push(result);
        actionTypes.add(action.type);
        console.log(`   ✓ ${result}`);
      }

      // Determine retry mode based on issue type and actions
      let retryMode: 'full' | 'validate' | 'none' = 'full';

      if (analysis.issueType === 'missing-tool') {
        retryMode = 'none';  // User must install manually
      } else if (actionTypes.size === 1 && actionTypes.has('create-symlink')) {
        retryMode = 'validate';  // Symlink-only: just validate
      } else if (actionTypes.has('log-setup-instructions')) {
        retryMode = 'none';  // Waiting for manual setup
      }
      // Otherwise: full rerun (definition updated)

      // Log success
      await logTaskEvent(
        projectDir,
        journalCtx.epicId,
        journalCtx.taskId,
        'TOOL_ENVIRONMENT_REPAIRED',
        `Adapted to ${analysis.issueType}: ${analysis.toolName}`,
        {
          strategyName: this.name,
          issueType: analysis.issueType,
          toolName: analysis.toolName,
          oldFormat: analysis.oldFormat,
          newFormat: analysis.newFormat,
          missingDependency: analysis.missingDependency,
          adaptationStrategy: analysis.adaptationStrategy,
          actions: results,
          retryMode,
        }
      );

      return {
        success: true,
        reason: `Fixed ${analysis.issueType} for ${analysis.toolName}: ${results.join(', ')}`,
        retryMode,
        metadata: {
          issueType: analysis.issueType,
          toolName: analysis.toolName,
          adaptationStrategy: analysis.adaptationStrategy,
        },
      };
    } catch (err: any) {
      console.error(`   ❌ Strategy failed:`, err.message);
      return {
        success: false,
        reason: `Tool/environment repair failed: ${err.message}`,
        shouldRetry: false,
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Analysis                                                          */
  /* ------------------------------------------------------------------ */

  private async analyze(
    gap: Gap,
    taskId: string,
    taskLogs: string[],
    filesystemState: string[],
    taskDefinition: any,
    ai: ReturnType<typeof createAIContext>
  ): Promise<ToolEnvironmentAnalysis> {
    const prompt = `You are analyzing a potential tool or environment configuration issue.

**Task Details:**
- Task: ${taskId}
- Gap Type: ${gap.metadata?.gapKind || gap.type}
- Expected Output: ${gap.metadata?.expectedOutput || 'N/A'}
- Actual Output: ${gap.metadata?.actualOutput || 'N/A'}

**Task Logs (last 100 lines):**
\`\`\`
${taskLogs.slice(-100).join('\n')}
\`\`\`

**Filesystem State:**
\`\`\`
${filesystemState.join('\n')}
\`\`\`

**Task Definition:**
\`\`\`json
${JSON.stringify(taskDefinition, null, 2)}
\`\`\`

**Your Task:**
Determine if this gap is caused by an external tool or environment issue.

**Issue Types:**
1. **tool-format-change**: External tool changed output format (e.g., Stitch CLI now outputs to directories instead of flat files)
2. **missing-tool**: Required CLI tool not installed or not in PATH
3. **tool-version-mismatch**: Tool version doesn't match expectations
4. **environment-config**: Missing environment variable or configuration
5. **not-applicable**: This is NOT a tool/environment issue (task logic bug, etc.)

**Detection Criteria:**
- **tool-format-change**: Logs show tool succeeded but files in unexpected location
- **missing-tool**: Command not found errors, or tool not invoked when expected
- **tool-version-mismatch**: Version mismatch warnings, deprecated API usage
- **environment-config**: Missing env vars, config file not found

**Return JSON:**
\`\`\`json
{
  "issueType": "tool-format-change",
  "toolName": "Stitch CLI",
  "oldFormat": "Flat files: .stitch/designs/{screenId}.html",
  "newFormat": "Directory structure: .stitch/designs/{screenId}/design.html",
  "reasoning": "Logs show 'stitch generate completed successfully' but output is in directory structure instead of flat file. Tool likely updated output format.",
  "adaptationStrategy": "both",
  "actions": [
    {
      "type": "update-task-md",
      "details": {
        "outputs": [".stitch/designs/home-lesson-tree/design.html"],
        "checks": [
          {
            "id": "design-exists",
            "cmd": "test -f .stitch/designs/home-lesson-tree/design.html || test -f .stitch/designs/home-lesson-tree.html",
            "description": "HTML design exists (handles both formats)"
          }
        ]
      }
    },
    {
      "type": "create-symlink",
      "details": {
        "from": ".stitch/designs/home-lesson-tree/design.html",
        "to": ".stitch/designs/home-lesson-tree.html"
      }
    }
  ]
}
\`\`\`

**Example (missing-tool):**
\`\`\`json
{
  "issueType": "missing-tool",
  "toolName": "Stitch CLI",
  "missingDependency": "stitch command not found in PATH",
  "reasoning": "Task logs show 'command not found: stitch'. The Stitch CLI is not installed or not in PATH.",
  "adaptationStrategy": "install-instructions",
  "actions": [
    {
      "type": "log-setup-instructions",
      "details": {
        "message": "Install Stitch CLI: npm install -g @google/stitch-cli",
        "requiredTools": ["stitch"],
        "setupCommands": ["npm install -g @google/stitch-cli"]
      }
    }
  ]
}
\`\`\`

Focus on detecting external tool/environment issues, not task logic bugs.`;

    return await ai.askJson<ToolEnvironmentAnalysis>(
      prompt,
      ToolEnvironmentAnalysisSchema,
      {
        phase: 'analyze',
        label: 'Tool/Environment Analysis',
        timeoutMs: 180_000,
      }
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Action Execution                                                  */
  /* ------------------------------------------------------------------ */

  private async executeAction(
    action: { type: string; details: Record<string, any> },
    gap: Gap,
    ctx: StrategyContext,
    filesystem: ReturnType<typeof createFilesystemHelper>
  ): Promise<string> {
    switch (action.type) {
      case 'update-task-md': {
        const { createTaskHelper } = await import('../helpers/task.ts');
        const task = createTaskHelper(ctx.projectDir, ctx.journalCtx.epicId);
        const skillPath = task.getSkillPath(ctx.journalCtx.taskId);
        await filesystem.updateTaskMd(skillPath, action.details);
        return `Updated TASK.md to match new tool format`;
      }

      case 'create-symlink': {
        const { from, to } = action.details;
        await filesystem.createSymlink(from, to);
        return `Created compatibility symlink: ${to} → ${from}`;
      }

      case 'create-wrapper': {
        const { scriptPath, content } = action.details;
        return `Wrapper script creation not fully implemented (would create: ${scriptPath})`;
      }

      case 'log-setup-instructions': {
        const { message, requiredTools, setupCommands } = action.details;
        console.log(`\n   📋 Setup Required:`);
        console.log(`      ${message}`);
        if (setupCommands && Array.isArray(setupCommands)) {
          console.log(`      Commands:`);
          setupCommands.forEach((cmd: string) => console.log(`        $ ${cmd}`));
        }
        return `Logged setup instructions for missing tools: ${requiredTools?.join(', ') || 'N/A'}`;
      }

      default:
        return `Unknown action type: ${action.type}`;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */
}
