/**
 * Helper to detect if a task ended with AskUserQuestion
 * by examining the task execution logs
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface UserQuestionDetection {
  awaitingUserInput: boolean;
  question?: string;
  options?: Array<{ label: string; description: string }>;
}

/**
 * Detect if task ended with AskUserQuestion by examining logs
 */
export async function detectUserQuestion(
  projectDir: string,
  epicId: string,
  taskId: string
): Promise<UserQuestionDetection> {
  try {
    // Check task execution log
    const logPath = join(
      projectDir,
      '.harness',
      'journal',
      'epics',
      epicId,
      'tasks',
      taskId,
      'attempts',
      'wip',
      'logs',
      'log.log'
    );

    if (!existsSync(logPath)) {
      return { awaitingUserInput: false };
    }

    const logContent = await readFile(logPath, 'utf-8');

    // Check for AskUserQuestion tool use in logs
    // Look for patterns like:
    // - [tool:AskUserQuestion]
    // - "name": "AskUserQuestion"
    // - Could you please provide

    const hasAskUserQuestion =
      logContent.includes('[tool:AskUserQuestion]') ||
      logContent.includes('"name":"AskUserQuestion"') ||
      logContent.includes('"name": "AskUserQuestion"');

    if (!hasAskUserQuestion) {
      // Also check for common question patterns in final output
      const lines = logContent.split('\n');
      const lastLines = lines.slice(-50).join('\n');

      const questionPatterns = [
        /Could you (?:please )?provide/i,
        /What (?:app |would you like|do you want)/i,
        /Please (?:provide|specify|tell me)/i,
        /Which (?:of the following|option)/i,
      ];

      const hasQuestionPattern = questionPatterns.some(pattern =>
        pattern.test(lastLines)
      );

      if (!hasQuestionPattern) {
        return { awaitingUserInput: false };
      }
    }

    // Extract question from log
    const question = extractQuestion(logContent);
    const options = extractOptions(logContent);

    return {
      awaitingUserInput: true,
      question,
      options,
    };
  } catch (err) {
    console.error(`Failed to detect user question:`, err);
    return { awaitingUserInput: false };
  }
}

/**
 * Extract the question text from logs
 */
function extractQuestion(logContent: string): string | undefined {
  // Try to find question in final text output
  const lines = logContent.split('\n');
  const lastLines = lines.slice(-100);

  // Look for question patterns
  for (let i = lastLines.length - 1; i >= 0; i--) {
    const line = lastLines[i];

    // Skip log metadata lines
    if (line.includes('[2026-') || line.includes('[INFO]') || line.includes('[TOOL')) {
      continue;
    }

    // Check if line contains a question
    if (
      line.includes('?') ||
      /Could you|What |Which |Please provide|Please specify/i.test(line)
    ) {
      // Extract text, removing markdown formatting
      let question = line
        .replace(/^\d+→/, '') // Remove line numbers
        .replace(/^[*#\s]+/, '') // Remove markdown
        .trim();

      if (question.length > 10) {
        return question;
      }
    }
  }

  return 'User input required (question detected in task output)';
}

/**
 * Extract question options from logs if present
 */
function extractOptions(logContent: string): Array<{ label: string; description: string }> | undefined {
  // Look for AskUserQuestion tool use with options
  const toolMatch = logContent.match(/\[tool:AskUserQuestion\]\s*\{[\s\S]*?"options":\s*(\[[\s\S]*?\])/);
  if (!toolMatch) {
    return undefined;
  }

  try {
    const optionsJson = toolMatch[1];
    const options = JSON.parse(optionsJson);

    if (Array.isArray(options) && options.length > 0) {
      return options.map(opt => ({
        label: opt.label || opt.name || String(opt),
        description: opt.description || '',
      }));
    }
  } catch {
    // Failed to parse options
  }

  return undefined;
}
