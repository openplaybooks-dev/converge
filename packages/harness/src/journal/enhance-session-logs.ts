/**
 * Enhance Session Logs
 *
 * Parses agentfn index.jsonl files and writes detailed tool call events
 * to session events.jsonl and session.log for richer debugging.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionLogger } from './session-logger.ts';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface IndexEntry {
  ts: string;
  type: string;
  event: string;
  data?: any;
  duration_ms?: number;
}

interface ToolCallEntry extends IndexEntry {
  type: 'tool';
  event: 'call';
  data: {
    tool: string;
    id: string;
    input: any;
  };
}

interface ToolResultEntry extends IndexEntry {
  type: 'tool';
  event: 'result';
  data: {
    tool_use_id: string;
    success: boolean;
    size: number;
    preview?: string;
  };
}

interface OutputTextEntry extends IndexEntry {
  type: 'output';
  event: 'text';
  data: {
    text: string;
    size: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Main Export                                                       */
/* ------------------------------------------------------------------ */

/**
 * Parse index.jsonl files from task attempt and write tool events to session log
 */
export async function enhanceSessionLogsFromAttempt(
  attemptDir: string,
  taskId: string,
  sessionLogger: SessionLogger,
): Promise<void> {
  const logsDir = join(attemptDir, 'logs');

  if (!existsSync(logsDir)) {
    return;
  }

  // Load events.jsonl for task lifecycle events
  const eventsFile = join(logsDir, 'events.jsonl');
  if (existsSync(eventsFile)) {
    await enhanceWithTaskEvents(eventsFile, taskId, sessionLogger);
  }

  // Load index.jsonl files for detailed tool calls
  const indexFiles = readdirSync(logsDir)
    .filter(f => f.endsWith('.index.jsonl'))
    .sort();

  if (indexFiles.length === 0) {
    return;
  }

  // Process latest index file
  const latestFile = join(logsDir, indexFiles.at(-1)!);
  const lines = readFileSync(latestFile, 'utf-8').split('\n').filter(Boolean);

  const toolCalls = new Map<string, ToolCallEntry>();

  for (const line of lines) {
    try {
      const entry: IndexEntry = JSON.parse(line);

      // Track tool calls
      if (entry.type === 'tool' && entry.event === 'call') {
        const toolCall = entry as ToolCallEntry;
        toolCalls.set(toolCall.data.id, toolCall);

        // Write tool call event
        await sessionLogger.writeSessionEvent('TOOL_CALL', formatToolCallMessage(toolCall), {
          taskId,
          tool: toolCall.data.tool,
          toolUseId: toolCall.data.id,
          input: toolCall.data.input,
          timestamp: toolCall.ts,
        });

        // Write to human-readable log
        await sessionLogger.writeSessionLog(
          `   ${getToolIcon(toolCall.data.tool)} ${formatToolCallForLog(toolCall)}\n`
        );
      }

      // Track tool results
      else if (entry.type === 'tool' && entry.event === 'result') {
        const toolResult = entry as ToolResultEntry;
        const originalCall = toolCalls.get(toolResult.data.tool_use_id);

        // Write tool result event
        await sessionLogger.writeSessionEvent('TOOL_RESULT', formatToolResultMessage(toolResult), {
          taskId,
          toolUseId: toolResult.data.tool_use_id,
          success: toolResult.data.success,
          size: toolResult.data.size,
          preview: toolResult.data.preview,
          tool: originalCall?.data.tool,
          timestamp: toolResult.ts,
        });

        // Optionally write result preview to log (only for small results)
        if (toolResult.data.size < 500 && toolResult.data.preview) {
          await sessionLogger.writeSessionLog(
            `   ${toolResult.data.success ? '✓' : '✗'} Result preview: ${toolResult.data.preview.substring(0, 100)}...\n`
          );
        }
      }

      // Track AI output text
      else if (entry.type === 'output' && entry.event === 'text') {
        const output = entry as OutputTextEntry;

        // Write AI output event
        await sessionLogger.writeSessionEvent('AI_OUTPUT', output.data.text.substring(0, 200), {
          taskId,
          fullText: output.data.text,
          size: output.data.size,
          timestamp: output.ts,
        });

        // Write to human-readable log (truncated)
        if (output.data.text.length < 200) {
          await sessionLogger.writeSessionLog(`   💭 ${output.data.text}\n`);
        } else {
          await sessionLogger.writeSessionLog(`   💭 ${output.data.text.substring(0, 150)}...\n`);
        }
      }
    } catch (err) {
      // Skip unparseable lines
      continue;
    }
  }
}

/**
 * Enhance session logs with task lifecycle events from events.jsonl
 */
async function enhanceWithTaskEvents(
  eventsFile: string,
  taskId: string,
  sessionLogger: SessionLogger,
): Promise<void> {
  const lines = readFileSync(eventsFile, 'utf-8').split('\n').filter(Boolean);

  // Track metrics for summary
  const metrics = {
    toolCalls: 0,
    aiOutputs: 0,
    strategiesTried: [] as string[],
    validationChecks: 0,
    startTime: null as string | null,
    endTime: null as string | null,
  };

  for (const line of lines) {
    try {
      const event = JSON.parse(line);

      // Track metrics
      if (event.type === 'task_start') {
        metrics.startTime = event.timestamp;
      }
      if (event.type === 'task_complete') {
        metrics.endTime = event.timestamp;
      }
      if (event.eventType === 'STRATEGY_FAILED' || event.eventType === 'STRATEGY_SUCCEEDED') {
        const strategyName = event.metadata?.strategyName || event.strategy;
        if (strategyName && !metrics.strategiesTried.includes(strategyName)) {
          metrics.strategiesTried.push(strategyName);
        }
      }
      if (event.type === 'validation_result') {
        metrics.validationChecks += event.checks?.length || 0;
      }

      // Task metadata (inputs/outputs)
      if (event.type === 'task_start') {
        await sessionLogger.writeSessionLog(
          `\n📋 Task Metadata:\n` +
          `   Name: ${event.taskName}\n` +
          `   Inputs: ${event.inputs?.length || 0} file(s)\n` +
          event.inputs?.map((i: string) => `     - ${i}`).join('\n') + '\n' +
          `   Outputs: ${event.outputs?.length || 0} file(s)\n` +
          event.outputs?.map((o: string) => `     - ${o}`).join('\n') + '\n\n'
        );
      }

      // Strategy attempts
      else if (event.eventType === 'STRATEGY_FAILED' || event.type === 'strategy_failed') {
        await sessionLogger.writeSessionLog(
          `   ⚠️  Strategy failed: ${event.metadata?.strategyName || event.strategy}\n` +
          `      Reason: ${event.metadata?.reason || event.reason || 'Unknown'}\n`
        );
      }

      else if (event.eventType === 'STRATEGY_SUCCEEDED') {
        await sessionLogger.writeSessionLog(
          `   ✅ Strategy succeeded: ${event.metadata?.strategyName}\n`
        );
      }

      // Validation results
      else if (event.type === 'validation_start') {
        await sessionLogger.writeSessionLog(
          `\n🔍 Validating outputs...\n`
        );
      }

      else if (event.type === 'validation_result') {
        const status = event.exists ? '✓' : '✗';
        const checksInfo = event.checks?.length > 0
          ? ` (${event.checks.filter((c: any) => c.passed).length}/${event.checks.length} checks passed)`
          : '';
        await sessionLogger.writeSessionLog(
          `   ${status} ${event.output}${checksInfo}\n`
        );

        // Show failed checks
        if (event.checks) {
          for (const check of event.checks) {
            if (!check.passed) {
              await sessionLogger.writeSessionLog(
                `      ✗ Check failed: ${check.id}\n` +
                (check.error ? `        Error: ${check.error}\n` : '')
              );
            }
          }
        }
      }

      // Task completion with summary
      else if (event.type === 'task_complete') {
        const duration = formatDuration(event.duration);
        const status = event.success ? '✅ Success' : '❌ Failed';

        await sessionLogger.writeSessionLog(
          `\n${'='.repeat(60)}\n` +
          `${status.padEnd(30)} ${duration.padStart(30)}\n` +
          `${'='.repeat(60)}\n` +
          `\n📊 Execution Summary:\n` +
          `   Status: ${event.success ? 'Completed successfully' : 'Failed'}\n` +
          `   Duration: ${duration}\n` +
          `   Outputs: ${event.outputs?.length || 0} file(s) created\n` +
          (event.outputs?.length > 0
            ? event.outputs.map((o: string) => `     ✓ ${o}`).join('\n') + '\n'
            : '') +
          `\n`
        );

        // Write structured completion event
        await sessionLogger.writeSessionEvent('TASK_EXECUTION_COMPLETE', 'Task execution finished', {
          taskId,
          success: event.success,
          duration: event.duration,
          outputs: event.outputs,
          timestamp: event.timestamp,
        });
      }

      // Gap resolution
      else if (event.type === 'gap_resolved') {
        const duration = formatDuration(event.duration);
        await sessionLogger.writeSessionLog(
          `   🎯 Gap resolved via ${event.strategy} (${duration})\n`
        );
      }

      // AI reasoning context
      else if (event.type === 'ai_reasoning') {
        if (event.context) {
          await sessionLogger.writeSessionLog(
            `\n🤖 AI Context:\n` +
            `   Max iterations: ${event.context.maxIterations}\n` +
            `   Has inputs: ${event.context.hasInputs}\n` +
            `   Has outputs: ${event.context.hasOutputs}\n` +
            `   Is WBS: ${event.context.isWbs}\n\n`
          );
        }
      }

      // Claude function calls
      else if (event.eventType === 'CLAUDEFN_START') {
        await sessionLogger.writeSessionLog(
          `\n🤖 ${event.message}\n`
        );
      }

      else if (event.eventType === 'CLAUDEFN_COMPLETE') {
        const duration = event.metadata?.durationMs
          ? formatDuration(event.metadata.durationMs)
          : 'unknown';
        await sessionLogger.writeSessionLog(
          `\n✅ Completed in ${duration}\n` +
          (event.metadata?.outputSnippet
            ? `   Output: ${event.metadata.outputSnippet.substring(0, 200)}...\n`
            : '')
        );
        metrics.aiOutputs++;
      }

    } catch (err) {
      // Skip unparseable lines
      continue;
    }
  }

  // Write task attempt summary
  if (metrics.startTime && metrics.endTime) {
    const totalDuration = new Date(metrics.endTime).getTime() - new Date(metrics.startTime).getTime();
    await sessionLogger.writeSessionLog(
      `\n${'─'.repeat(60)}\n` +
      `📈 Task Attempt Metrics:\n` +
      `   Total duration: ${formatDuration(totalDuration)}\n` +
      `   Strategies tried: ${metrics.strategiesTried.length} (${metrics.strategiesTried.join(', ')})\n` +
      `   Validation checks: ${metrics.validationChecks}\n` +
      `   AI outputs: ${metrics.aiOutputs}\n` +
      `${'─'.repeat(60)}\n\n`
    );
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/* ------------------------------------------------------------------ */
/*  Formatting Utilities                                              */
/* ------------------------------------------------------------------ */

function getToolIcon(tool: string): string {
  const icons: Record<string, string> = {
    'Read': '📖',
    'Write': '✍️',
    'Edit': '✏️',
    'Bash': '⚙️',
    'Skill': '🛠️',
    'Glob': '📂',
    'Grep': '🔍',
    'Task': '🤖',
  };
  return icons[tool] || '🔧';
}

function formatToolCallMessage(call: ToolCallEntry): string {
  const { tool, input } = call.data;

  switch (tool) {
    case 'Read':
      return `Read ${input.file_path || input.file || 'file'}`;
    case 'Write':
      return `Write ${input.file_path || input.file || 'file'}${input.size ? ` (${formatBytes(input.size)})` : ''}`;
    case 'Edit':
      return `Edit ${input.file_path || 'file'}`;
    case 'Bash':
      const cmd = input.command?.substring(0, 50) || 'command';
      return `Run: ${cmd}${input.command?.length > 50 ? '...' : ''}`;
    case 'Skill':
      return `Skill: /${input.skill || 'unknown'}`;
    case 'Glob':
      return `Glob: ${input.pattern || '*'}${input.path ? ` in ${input.path}` : ''}`;
    case 'Grep':
      return `Grep: ${input.pattern || ''}${input.path ? ` in ${input.path}` : ''}`;
    default:
      return `${tool} call`;
  }
}

function formatToolCallForLog(call: ToolCallEntry): string {
  return formatToolCallMessage(call);
}

function formatToolResultMessage(result: ToolResultEntry): string {
  const status = result.data.success ? 'Success' : 'Failed';
  const size = formatBytes(result.data.size);
  return `Tool result: ${status} (${size})`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
