/**
 * UserQuestionResumeStrategy
 *
 * Handles gaps where the task ended with AskUserQuestion.
 * Instead of treating this as a failure requiring repair, this strategy:
 *   1. Detects that the task asked the user a question
 *   2. Creates LEARN.md documenting the question and context
 *   3. Waits for user response
 *   4. On next attempt, resumes task execution with the answer
 *
 * This prevents expensive AI repair analysis for tasks that are simply
 * waiting for user input.
 */

import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { Gap } from "../../../task/gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { logTaskEvent } from "../../../journal/writer.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface UserQuestionContext {
  question: string;
  options?: Array<{ label: string; description: string }>;
  detectedAt: string;
  taskId: string;
  attempt: number;
}

/* ------------------------------------------------------------------ */
/*  UserQuestionResumeStrategy                                        */
/* ------------------------------------------------------------------ */

export class UserQuestionResumeStrategy implements FixStrategy {
  readonly name = "user-question-resume";
  readonly description =
    "Handles tasks waiting for user input - creates LEARN.md and resumes on next attempt";
  readonly priority = 10; // High priority - check before expensive AI repair

  canHandle(gap: Gap): boolean {
    // Only handle output gaps where task asked user a question
    if (gap.metadata?.gapKind !== "output") {
      return false;
    }

    // Check if task ended with AskUserQuestion
    const awaitingUserInput = gap.metadata?.awaitingUserInput === true;
    return awaitingUserInput;
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    console.log(`   ❓ Task is awaiting user input - preparing to resume...`);

    try {
      // Get attempt directory
      const attemptDir = join(
        projectDir,
        ".converge",
        "journal",
        "epics",
        journalCtx.epicId,
        "tasks",
        journalCtx.taskId,
        "attempts",
        "wip",
      );

      const isAutonomous = true; // Converge is always autonomous

      if (isAutonomous) {
        console.log(`   🤖 Autonomous mode — auto-answering...`);
        return await this.autonomousAutoAnswer(gap, ctx, attemptDir);
      }

      // Check if user has already provided an answer (ANSWER.md exists)
      const answerPath = join(attemptDir, "ANSWER.md");
      const hasAnswer = existsSync(answerPath);

      if (hasAnswer) {
        // User provided answer - resume task execution
        console.log(`   ✅ User answer found - resuming task...`);
        return await this.resumeWithAnswer(gap, ctx, answerPath, attemptDir);
      } else {
        // No answer yet - create LEARN.md to document the question
        console.log(`   📝 Creating LEARN.md with user question...`);
        return await this.createQuestionLearn(gap, ctx, attemptDir);
      }
    } catch (err: any) {
      console.error(`   ❌ Strategy failed:`, err.message);
      return {
        success: false,
        reason: `Failed to handle user question: ${err.message}`,
        shouldRetry: false,
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Create LEARN.md with user question                               */
  /* ------------------------------------------------------------------ */

  private async createQuestionLearn(
    gap: Gap,
    ctx: StrategyContext,
    attemptDir: string,
  ): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    // Extract question from gap metadata
    const question =
      (gap.metadata?.userQuestion as string) || "User input required";
    const options = gap.metadata?.userQuestionOptions as
      | Array<{ label: string; description: string }>
      | undefined;

    // Read task logs to get full context
    const logPath = join(attemptDir, "logs", "log.log");
    let taskOutput = "";
    if (existsSync(logPath)) {
      taskOutput = await readFile(logPath, "utf-8");
      // Extract last 100 lines
      const lines = taskOutput.split("\n");
      taskOutput = lines.slice(-100).join("\n");
    }

    // Create LEARN.md content
    const questionContext: UserQuestionContext = {
      question,
      options,
      detectedAt: new Date().toISOString(),
      taskId: journalCtx.taskId,
      attempt: ctx.attempt,
    };

    const learnContent = this.formatQuestionLearn(questionContext, taskOutput);
    const learnPath = join(attemptDir, "LEARN.md");
    await writeFile(learnPath, learnContent);

    // Create template ANSWER.md for user to fill in
    const answerTemplate = this.createAnswerTemplate(question, options);
    const answerPath = join(attemptDir, "ANSWER.md");
    if (!existsSync(answerPath)) {
      await writeFile(answerPath, answerTemplate);
    }

    // Log event
    await logTaskEvent(
      projectDir,
      journalCtx.epicId,
      journalCtx.taskId,
      "AWAITING_USER_INPUT",
      `Task is waiting for user to answer question`,
      {
        gapId: gap.id,
        question,
        learnPath,
        answerPath,
      },
    );

    console.log(`   📄 Created LEARN.md: ${learnPath}`);
    console.log(`   📝 User should edit ANSWER.md: ${answerPath}`);
    console.log(`   💡 After providing answer, re-run the task to resume`);

    return {
      success: false, // Not fixed yet - waiting for user
      reason:
        "Awaiting user input. User should edit ANSWER.md and re-run the task.",
      shouldRetry: false, // Don't retry until user provides answer
      metadata: {
        awaitingUserInput: true,
        learnPath,
        answerPath,
        question,
      },
    };
  }

  private async autonomousAutoAnswer(
    gap: Gap,
    ctx: StrategyContext,
    attemptDir: string,
  ): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    const resumePath = join(attemptDir, "RESUME.md");
    const resumeContent = this.createResumeInstructions("", gap);
    await writeFile(resumePath, resumeContent);

    await logTaskEvent(
      projectDir,
      journalCtx.epicId,
      journalCtx.taskId,
      "AUTO_ANSWER",
      `Autonomous mode auto-answered AskUserQuestion`,
      { gapId: gap.id },
    );

    console.log(`   ✅ Auto-answered in autonomous mode`);
    console.log(`   📋 Created RESUME.md: ${resumePath}`);
    console.log(`   🔄 Task will resume on next execution`);

    return {
      success: true,
      reason: "Auto-answered in autonomous mode",
      retryMode: "rerun",
      metadata: { autoAnswered: true, answer: "" },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Resume task with user answer                                     */
  /* ------------------------------------------------------------------ */

  private async resumeWithAnswer(
    gap: Gap,
    ctx: StrategyContext,
    answerPath: string,
    attemptDir: string,
  ): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    // Read user's answer
    const answerContent = await readFile(answerPath, "utf-8");
    const answer = this.parseAnswer(answerContent);

    if (!answer) {
      console.log(
        `   ⚠️  ANSWER.md is empty or invalid - user needs to provide answer`,
      );
      return {
        success: false,
        reason: "ANSWER.md exists but is empty. User needs to fill it in.",
        shouldRetry: false,
      };
    }

    console.log(`   📖 User answer: "${answer.slice(0, 100)}..."`);

    // Update LEARN.md with the answer
    const learnPath = join(attemptDir, "LEARN.md");
    if (existsSync(learnPath)) {
      const learnContent = await readFile(learnPath, "utf-8");
      const updatedLearn =
        learnContent +
        `\n\n## User Answer\n\nProvided at: ${new Date().toISOString()}\n\n${answer}\n`;
      await writeFile(learnPath, updatedLearn);
    }

    // Create RESUME.md with instructions for continuing the task
    const resumePath = join(attemptDir, "RESUME.md");
    const resumeContent = this.createResumeInstructions(answer, gap);
    await writeFile(resumePath, resumeContent);

    // Log event
    await logTaskEvent(
      projectDir,
      journalCtx.epicId,
      journalCtx.taskId,
      "USER_INPUT_RECEIVED",
      `User provided answer - ready to resume task`,
      {
        gapId: gap.id,
        answerPreview: answer.slice(0, 200),
        resumePath,
      },
    );

    console.log(`   ✅ User answer received`);
    console.log(`   📋 Created RESUME.md: ${resumePath}`);
    console.log(`   🔄 Task will resume with user's answer on next execution`);

    // Return success with instruction to resume task
    // The task-run strategy will pick up RESUME.md and use it in the prompt
    return {
      success: true,
      reason: "User answer received - task ready to resume",
      retryMode: "rerun", // Trigger task re-execution
      metadata: {
        userAnswerReceived: true,
        answer,
        resumePath,
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Helper methods                                                    */
  /* ------------------------------------------------------------------ */

  private formatQuestionLearn(
    context: UserQuestionContext,
    taskOutput: string,
  ): string {
    let content = `# User Question: ${context.taskId}\n\n`;
    content += `> **Status**: Awaiting user input\n\n`;
    content += `## Question\n\n${context.question}\n\n`;

    if (context.options && context.options.length > 0) {
      content += `## Options\n\n`;
      for (const opt of context.options) {
        content += `- **${opt.label}**: ${opt.description}\n`;
      }
      content += `\n`;
    }

    content += `## Context\n\n`;
    content += `- Task ID: ${context.taskId}\n`;
    content += `- Attempt: ${context.attempt}\n`;
    content += `- Detected: ${context.detectedAt}\n\n`;

    content += `## Task Output (last 100 lines)\n\n\`\`\`\n${taskOutput}\n\`\`\`\n\n`;

    content += `## Next Steps\n\n`;
    content += `1. User should review the question above\n`;
    content += `2. Edit ANSWER.md in this directory with the response\n`;
    content += `3. Re-run the task - it will resume from where it left off\n`;

    return content;
  }

  private createAnswerTemplate(
    question: string,
    options?: Array<{ label: string; description: string }>,
  ): string {
    let content = `# User Answer\n\n`;
    content += `**Question**: ${question}\n\n`;

    if (options && options.length > 0) {
      content += `## Available Options\n\n`;
      for (const opt of options) {
        content += `- [ ] **${opt.label}**: ${opt.description}\n`;
      }
      content += `\n`;
    }

    content += `## Your Answer\n\n`;
    content += `<!-- Replace this with your answer -->\n\n`;

    return content;
  }

  private parseAnswer(content: string): string | null {
    // Remove markdown comments
    let answer = content.replace(/<!--[\s\S]*?-->/g, "");

    // Extract content after "## Your Answer" heading if present
    const answerMatch = answer.match(/##\s*Your Answer\s*\n+([\s\S]+)/i);
    if (answerMatch) {
      answer = answerMatch[1];
    }

    // Remove "# User Answer" and "**Question**" sections
    answer = answer.replace(/^#\s*User Answer[\s\S]*?\n\n/, "");
    answer = answer.replace(/\*\*Question\*\*:[\s\S]*?\n\n/, "");
    answer = answer.replace(/##\s*Available Options[\s\S]*?\n\n/, "");

    answer = answer.trim();

    return answer.length > 0 ? answer : null;
  }

  private createResumeInstructions(answer: string, gap: Gap): string {
    let content = `# Resume Task Execution\n\n`;
    content += `> **User Input Received** - Continue from where the task left off\n\n`;

    content += `## User's Answer\n\n${answer}\n\n`;

    content += `## Instructions for AI\n\n`;
    content += `The previous task execution asked the user a question and is now resuming with the answer above.\n\n`;
    content += `**Your task:**\n`;
    content += `1. Read the user's answer above\n`;
    content += `2. Review TASK.md to understand what the task needs to accomplish\n`;
    content += `3. Continue the task execution using the user's answer\n`;
    content += `4. Complete all remaining outputs and checks\n\n`;

    const taskOutputs = gap.metadata?.outputs as string[] | undefined;
    if (taskOutputs && taskOutputs.length > 0) {
      content += `## Expected Outputs\n\n`;
      for (const output of taskOutputs) {
        content += `- [ ] ${output}\n`;
      }
      content += `\n`;
    }

    content += `## Important\n\n`;
    content += `- Do NOT ask the same question again\n`;
    content += `- Use the answer provided to make decisions and generate outputs\n`;
    content += `- If you need additional information, check existing files first before asking\n`;

    return content;
  }
}
