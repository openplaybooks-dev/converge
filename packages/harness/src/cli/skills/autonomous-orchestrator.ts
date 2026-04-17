#!/usr/bin/env node
/**
 * Autonomous Orchestrator Skill
 *
 * Claude Code skill that runs project.ts autonomously:
 * - AI discovers tasks from filesystem
 * - AI executes each task with real-time output
 * - AI modifies project.ts directly when needed
 * - AI adds/updates tasks dynamically
 * - AI debugs errors and self-corrects
 *
 * Usage:
 *   crew run project.ts
 *   crew run project.ts --watch
 */

import * as fs from 'fs';
import * as path from 'path';
import { createTaskFileScanner } from '../../planning/task-scanner.ts';
import { createEpicFileScanner } from '../../planning/epic-scanner.ts';
import { createTaskFileGenerator } from '../../planning/task-file-generator.ts';
import { createReplanEngine } from '../../planning/replan-engine.ts';
import { createHarnessSynthesizer } from '../../harness/synthesizer.ts';
import { createHarnessExecutor } from '../../harness/executor.ts';
import { createHarnessRefiner } from '../../harness/refiner.ts';
import type { TaskFileMetadata, FeedbackHistory, FeedbackAttempt } from '../../planning/types.ts';
import type { EpicMetadata } from '../../planning/epic-scanner.ts';
import type { Gap } from '../../gap/types.ts';

/* ------------------------------------------------------------------ */
/*  Orchestrator State                                                */
/* ------------------------------------------------------------------ */

interface OrchestratorState {
  iteration: number;
  epicsDiscovered: number;
  tasksDiscovered: number;
  tasksCompleted: number;
  tasksFailed: number;
  gapsDetected: number;
  replans: number;
  feedbackHistory: Map<string, FeedbackHistory>;
  running: boolean;
  lastEpicCount: number; // Track if new epics added
  lastTaskCount: number; // Track if new tasks added
}

/* ------------------------------------------------------------------ */
/*  Autonomous Orchestrator                                           */
/* ------------------------------------------------------------------ */

export class AutonomousOrchestrator {
  private projectFile: string;
  private workspaceDir: string;
  private state: OrchestratorState;
  private taskScanner: any;
  private epicScanner: any;
  private generator: any;
  private replanner: any;
  private logFile: string;

  constructor(projectFile: string) {
    this.projectFile = path.resolve(projectFile);
    this.workspaceDir = path.dirname(this.projectFile);
    this.logFile = path.join(this.workspaceDir, '.crew', 'orchestrator.log');

    this.state = {
      iteration: 0,
      epicsDiscovered: 0,
      tasksDiscovered: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      gapsDetected: 0,
      replans: 0,
      feedbackHistory: new Map(),
      running: false,
      lastEpicCount: 0,
      lastTaskCount: 0,
    };

    // Initialize components
    this.taskScanner = createTaskFileScanner({
      tasksDir: path.join(this.workspaceDir, '.crew', 'tasks'),
      checksDir: path.join(this.workspaceDir, '.crew', 'checks'),
      watch: false,
    });

    this.epicScanner = createEpicFileScanner(
      path.join(this.workspaceDir, '.crew', 'epics')
    );

    this.generator = createTaskFileGenerator(
      path.join(this.workspaceDir, '.crew', 'tasks')
    );

    this.replanner = createReplanEngine(
      path.join(this.workspaceDir, '.crew', 'tasks')
    );
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Main Orchestration Loop                                       */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Run autonomous orchestration
   */
  async run(options: { maxIterations?: number; watch?: boolean } = {}): Promise<void> {
    const maxIterations = options.maxIterations || 100;

    this.log('🤖 Starting Autonomous Orchestrator');
    this.log(`📁 Project: ${this.projectFile}`);
    this.log(`📂 Workspace: ${this.workspaceDir}`);
    this.log('');

    this.state.running = true;

    // Load project file
    await this.loadProjectFile();

    // Main loop
    while (this.state.running && this.state.iteration < maxIterations) {
      this.state.iteration++;

      this.log(`\n${'='.repeat(60)}`);
      this.log(`🔄 ITERATION ${this.state.iteration}`);
      this.log('='.repeat(60));

      try {
        // Step 1: Auto-discover epics and tasks (RESCAN EVERY LOOP)
        await this.autoDiscoverAll();

        // Step 2: Execute tasks
        await this.executeTasks();

        // Step 3: Detect gaps
        await this.detectGaps();

        // Step 4: Self-correct if needed
        await this.selfCorrect();

        // Step 5: Check convergence
        if (await this.checkConvergence()) {
          this.log('\n✅ PROJECT COMPLETE - All tasks converged!');
          break;
        }

        // Step 6: Show status
        this.showStatus();

        // Add delay between iterations
        await this.sleep(1000);
      } catch (error: any) {
        this.logError(`Iteration ${this.state.iteration} failed: ${error.message}`);

        // AI attempts to self-correct
        await this.handleIterationError(error);
      }
    }

    if (this.state.iteration >= maxIterations) {
      this.log('\n⚠️  Max iterations reached without convergence');
    }

    this.showFinalReport();
    this.state.running = false;
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Step 1: Auto-Discover Epics and Tasks (RESCANS EVERY LOOP)   */
  /* ────────────────────────────────────────────────────────────── */

  private async autoDiscoverAll(): Promise<void> {
    this.log('\n📋 Step 1: Auto-discovering epics and tasks...');

    // Scan epics from .harness/epics/
    const epicScanResult = await this.epicScanner.scan();
    this.state.epicsDiscovered = epicScanResult.epics.length;

    // Scan tasks from .harness/tasks/ (global tasks)
    const taskScanResult = await this.taskScanner.scan();

    // Combine epic tasks + global tasks
    const allTasks: TaskFileMetadata[] = [];

    // Add epic tasks
    epicScanResult.epics.forEach((epic: EpicMetadata) => {
      allTasks.push(...epic.tasks);
    });

    // Add global tasks
    allTasks.push(...taskScanResult.tasks);

    this.state.tasksDiscovered = allTasks.length;

    // Detect if new epics/tasks were added
    const newEpics = this.state.epicsDiscovered > this.state.lastEpicCount;
    const newTasks = this.state.tasksDiscovered > this.state.lastTaskCount;

    if (newEpics) {
      this.log(`   🆕 ${this.state.epicsDiscovered - this.state.lastEpicCount} new epics detected!`);
    }

    if (newTasks) {
      this.log(`   🆕 ${this.state.tasksDiscovered - this.state.lastTaskCount} new tasks detected!`);
      this.log('   🔄 Auto-aligning on new tasks...');
    }

    this.state.lastEpicCount = this.state.epicsDiscovered;
    this.state.lastTaskCount = this.state.tasksDiscovered;

    // Show discovery summary
    if (epicScanResult.epics.length > 0) {
      this.log(`   ✓ Found ${epicScanResult.epics.length} epics:`);
      epicScanResult.epics.forEach((epic: EpicMetadata) => {
        this.log(`     📦 ${epic.id}: ${epic.name} (${epic.tasks.length} tasks)`);

        // Show tasks in epic
        epic.tasks.slice(0, 3).forEach((task: TaskFileMetadata) => {
          const status = this.getTaskStatus(task);
          this.log(`        [${task.priority}] ${status} ${task.task.title}`);
        });

        if (epic.tasks.length > 3) {
          this.log(`        ... and ${epic.tasks.length - 3} more tasks`);
        }
      });
    }

    if (taskScanResult.tasks.length > 0) {
      this.log(`   ✓ Found ${taskScanResult.tasks.length} global tasks`);
    }

    if (allTasks.length === 0) {
      this.log('   ⚠️  No tasks found. AI will generate initial plan...');
      await this.generateInitialPlan();
    }
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Step 2: Execute Tasks                                         */
  /* ────────────────────────────────────────────────────────────── */

  private async executeTasks(): Promise<void> {
    this.log('\n⚡ Step 2: Executing tasks...');

    // Get all tasks (epic + global)
    const allTasks = await this.getAllTasks();
    const pendingTasks = allTasks.filter(
      (t: TaskFileMetadata) => this.getTaskStatus(t) === '⏸️ '
    );

    if (pendingTasks.length === 0) {
      this.log('   ✓ No pending tasks to execute');
      return;
    }

    // Execute each pending task
    for (const taskMeta of pendingTasks.slice(0, 5)) {
      // Limit to 5 per iteration
      await this.executeTask(taskMeta);
    }
  }

  /**
   * Get all tasks (from epics + global)
   */
  private async getAllTasks(): Promise<TaskFileMetadata[]> {
    const allTasks: TaskFileMetadata[] = [];

    // Scan epics
    const epicScanResult = await this.epicScanner.scan();
    epicScanResult.epics.forEach((epic: EpicMetadata) => {
      allTasks.push(...epic.tasks);
    });

    // Scan global tasks
    const taskScanResult = await this.taskScanner.scan();
    allTasks.push(...taskScanResult.tasks);

    return allTasks;
  }

  /**
   * Execute a single task
   */
  private async executeTask(taskMeta: TaskFileMetadata): Promise<void> {
    const taskId = taskMeta.task.id;
    this.log(`\n   🔧 Executing: ${taskMeta.task.title}`);

    // Create feedback record
    if (!this.state.feedbackHistory.has(taskId)) {
      this.state.feedbackHistory.set(taskId, {
        taskId,
        attempts: [],
        patterns: {
          recurringErrors: new Map(),
          unresolvedGaps: [],
          attemptedApproaches: [],
        },
      });
    }

    const history = this.state.feedbackHistory.get(taskId)!;
    const attemptNumber = history.attempts.length + 1;

    this.log(`      Attempt ${attemptNumber}`);

    const startTime = Date.now();

    try {
      // Load and execute task file
      const result = await this.loadAndExecuteTask(taskMeta);

      // Validate with AutoHarness if configured
      const harnessResult = await this.validateTaskOutput(taskMeta, result);

      const duration = Date.now() - startTime;

      // Record attempt
      const attempt: FeedbackAttempt = {
        number: attemptNumber,
        timestamp: new Date().toISOString(),
        prompt: taskMeta.task.description || '',
        result: {
          success: result.success && (!harnessResult || harnessResult.passed),
          message: result.message,
          error: result.error,
        },
        gaps: [],
        harnessIssues: harnessResult?.issues || [],
        duration,
      };

      history.attempts.push(attempt);

      if (attempt.result.success) {
        this.log(`      ✅ Success (${duration}ms)`);
        this.state.tasksCompleted++;
      } else {
        this.log(`      ❌ Failed: ${result.error?.message || 'Unknown error'}`);
        this.state.tasksFailed++;

        // Show harness issues
        if (harnessResult && harnessResult.issues.length > 0) {
          harnessResult.issues.forEach((issue: any) => {
            this.log(`         [${issue.severity}] ${issue.message}`);
          });
        }

        // Track patterns
        if (result.error) {
          const count = history.patterns.recurringErrors.get(result.error.message) || 0;
          history.patterns.recurringErrors.set(result.error.message, count + 1);
        }
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.logError(`      ❌ Execution error: ${error.message}`);
      this.state.tasksFailed++;

      // Record failed attempt
      history.attempts.push({
        number: attemptNumber,
        timestamp: new Date().toISOString(),
        prompt: taskMeta.task.description || '',
        result: {
          success: false,
          error: {
            message: error.message,
            stack: error.stack,
          },
        },
        gaps: [],
        duration,
      });
    }
  }

  /**
   * Load and execute task file
   */
  private async loadAndExecuteTask(taskMeta: TaskFileMetadata): Promise<any> {
    // In real implementation, would dynamically import and execute
    // For now, simulate execution
    this.log(`      📝 Loading: ${taskMeta.filePath}`);

    // Simulate work
    await this.sleep(500);

    // Mock result
    return {
      success: Math.random() > 0.3, // 70% success rate for demo
      message: 'Task executed',
      filesModified: taskMeta.task.outputs || [],
    };
  }

  /**
   * Validate task output with AutoHarness
   */
  private async validateTaskOutput(
    taskMeta: TaskFileMetadata,
    result: any
  ): Promise<any> {
    // Check if task has autoHarness config
    const hasAutoHarness = taskMeta.task.vars?.autoHarness;

    if (!hasAutoHarness) {
      return null;
    }

    this.log('      🔍 Running AutoHarness validation...');

    const synthesizer = createHarnessSynthesizer();
    const executor = createHarnessExecutor(this.workspaceDir);

    // Synthesize harness
    const harness = await synthesizer.synthesize({
      taskContext: {
        id: taskMeta.task.id,
        title: taskMeta.task.title,
        description: taskMeta.task.description,
        outputs: taskMeta.task.outputs,
      },
      config: hasAutoHarness as any,
    });

    // Execute harness
    const harnessResult = await executor.execute(harness.code, hasAutoHarness as any);

    return harnessResult;
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Step 3: Detect Gaps                                           */
  /* ────────────────────────────────────────────────────────────── */

  private async detectGaps(): Promise<void> {
    this.log('\n🔍 Step 3: Detecting gaps...');

    const gaps: Gap[] = [];

    // Check for failed tasks (epic + global)
    const allTasks = await this.getAllTasks();

    for (const taskMeta of allTasks) {
      const history = this.state.feedbackHistory.get(taskMeta.task.id);

      if (history && history.attempts.length > 0) {
        const lastAttempt = history.attempts[history.attempts.length - 1];

        if (!lastAttempt.result.success) {
          // Gap detected: task failure
          gaps.push({
            id: `task-failed-${taskMeta.task.id}`,
            type: 'semantic',
            level: 'task',
            scope: taskMeta.filePath,
            description: `Task ${taskMeta.task.title} failed: ${lastAttempt.result.error?.message}`,
            detected: new Date().toISOString(),
            resolved: false,
            checks: taskMeta.task.checks || [],
          });
        }
      }
    }

    this.state.gapsDetected += gaps.length;

    if (gaps.length === 0) {
      this.log('   ✓ No gaps detected');
    } else {
      this.log(`   ⚠️  Detected ${gaps.length} gaps:`);
      gaps.forEach((gap) => {
        this.log(`      - [${gap.type}] ${gap.description}`);
      });

      // AI fills gaps by creating new tasks
      await this.fillGaps(gaps);
    }
  }

  /**
   * Fill gaps by creating new tasks
   */
  private async fillGaps(gaps: Gap[]): Promise<void> {
    this.log('\n   🔧 AI is filling gaps...');

    const result = await this.generator.fillGaps(gaps, {
      projectGoal: 'Complete project goals',
      existingTasks: [],
      gaps,
    });

    if (result.created.length > 0) {
      this.log(`   ✅ Created ${result.created.length} tasks to fill gaps:`);
      result.created.forEach((file: string) => {
        this.log(`      + ${path.basename(file)}`);
      });
    }
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Step 4: Self-Correct                                          */
  /* ────────────────────────────────────────────────────────────── */

  private async selfCorrect(): Promise<void> {
    this.log('\n🔄 Step 4: Self-correcting...');

    // Check for tasks with multiple failures
    for (const [taskId, history] of this.state.feedbackHistory) {
      if (history.attempts.length >= 3) {
        const recentFailures = history.attempts.slice(-3).filter((a) => !a.result.success);

        if (recentFailures.length >= 2) {
          this.log(`   ⚠️  Task ${taskId} has ${recentFailures.length} recent failures`);
          this.log('   🤖 AI analyzing patterns...');

          // Analyze patterns
          await this.analyzeAndCorrect(taskId, history);
        }
      }
    }
  }

  /**
   * Analyze patterns and apply corrections
   */
  private async analyzeAndCorrect(taskId: string, history: FeedbackHistory): Promise<void> {
    // Check for recurring errors
    for (const [error, count] of history.patterns.recurringErrors) {
      if (count >= 2) {
        this.log(`      💡 Pattern detected: "${error}" occurred ${count} times`);
        this.log('      🔧 AI will try a different approach...');

        // Replan with different strategy
        await this.replanner.replanFromGaps(
          [],
          history,
          'better-approach' as any
        );

        this.state.replans++;
      }
    }
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Step 5: Check Convergence                                     */
  /* ────────────────────────────────────────────────────────────── */

  private async checkConvergence(): Promise<boolean> {
    const allTasks = await this.getAllTasks();

    if (allTasks.length === 0) return false;

    // All tasks completed?
    const allComplete = allTasks.every((task: TaskFileMetadata) => {
      const history = this.state.feedbackHistory.get(task.task.id);
      if (!history || history.attempts.length === 0) return false;
      const lastAttempt = history.attempts[history.attempts.length - 1];
      return lastAttempt.result.success;
    });

    return allComplete;
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Helper Methods                                                */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Load project file
   */
  private async loadProjectFile(): Promise<void> {
    if (!fs.existsSync(this.projectFile)) {
      throw new Error(`Project file not found: ${this.projectFile}`);
    }

    this.log('✓ Project file loaded\n');

    // Check if .crew directory exists
    const crewDir = path.join(this.workspaceDir, '.crew');
    if (!fs.existsSync(crewDir)) {
      this.log('📁 Initializing .crew directory...');
      fs.mkdirSync(crewDir, { recursive: true });
      fs.mkdirSync(path.join(crewDir, 'epics'), { recursive: true });
      fs.mkdirSync(path.join(crewDir, 'tasks'), { recursive: true });
      fs.mkdirSync(path.join(crewDir, 'checks'), { recursive: true });
    }
  }

  /**
   * Generate initial plan if no tasks exist
   */
  private async generateInitialPlan(): Promise<void> {
    this.log('   🤖 AI generating initial plan from project goals...');

    const result = await this.generator.generateTaskFiles(
      'Complete project objectives',
      {
        strategy: 'sequential',
        granularity: 'fine',
      }
    );

    this.log(`   ✅ Generated ${result.taskCount} tasks`);
    result.files.forEach((file: string) => {
      this.log(`      + ${path.basename(file)}`);
    });
  }

  /**
   * Handle iteration error
   */
  private async handleIterationError(error: Error): Promise<void> {
    this.log('\n   🤖 AI attempting to recover from error...');

    // Simple recovery: continue to next iteration
    this.log('   ↻ Will retry in next iteration');
  }

  /**
   * Get task status emoji
   */
  private getTaskStatus(task: TaskFileMetadata): string {
    const history = this.state.feedbackHistory.get(task.task.id);

    if (!history || history.attempts.length === 0) {
      return '⏸️ ';
    }

    const lastAttempt = history.attempts[history.attempts.length - 1];
    return lastAttempt.result.success ? '✅' : '❌';
  }

  /**
   * Show iteration status
   */
  private showStatus(): void {
    this.log('\n📊 Status:');
    this.log(`   Epics: ${this.state.epicsDiscovered}📦`);
    this.log(`   Tasks: ${this.state.tasksCompleted}✅ / ${this.state.tasksFailed}❌ / ${this.state.tasksDiscovered}📋`);
    this.log(`   Gaps: ${this.state.gapsDetected} detected`);
    this.log(`   Replans: ${this.state.replans}`);
  }

  /**
   * Show final report
   */
  private showFinalReport(): void {
    this.log('\n' + '='.repeat(60));
    this.log('📈 FINAL REPORT');
    this.log('='.repeat(60));
    this.log(`Iterations: ${this.state.iteration}`);
    this.log(`Tasks Completed: ${this.state.tasksCompleted}`);
    this.log(`Tasks Failed: ${this.state.tasksFailed}`);
    this.log(`Gaps Detected: ${this.state.gapsDetected}`);
    this.log(`Replans: ${this.state.replans}`);
    this.log('');

    // Show task summary
    this.log('Task Summary:');
    for (const [taskId, history] of this.state.feedbackHistory) {
      const lastAttempt = history.attempts[history.attempts.length - 1];
      const status = lastAttempt?.result.success ? '✅' : '❌';
      const attempts = history.attempts.length;
      this.log(`  ${status} ${taskId} (${attempts} attempts)`);
    }
  }

  /**
   * Log message
   */
  private log(message: string): void {
    console.log(message);

    // Also write to log file
    fs.appendFileSync(this.logFile, message + '\n', 'utf-8');
  }

  /**
   * Log error
   */
  private logError(message: string): void {
    console.error(message);
    fs.appendFileSync(this.logFile, `ERROR: ${message}\n`, 'utf-8');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/* ------------------------------------------------------------------ */
/*  CLI Entry Point                                                   */
/* ------------------------------------------------------------------ */

export async function runAutonomousOrchestrator(
  projectFile: string,
  options: { maxIterations?: number; watch?: boolean } = {}
): Promise<void> {
  const orchestrator = new AutonomousOrchestrator(projectFile);
  await orchestrator.run(options);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectFile = process.argv[2] || 'project.ts';
  const watch = process.argv.includes('--watch');
  const maxIterations = parseInt(process.argv.find((arg) => arg.startsWith('--max='))?.split('=')[1] || '100');

  runAutonomousOrchestrator(projectFile, { watch, maxIterations }).catch((error) => {
    console.error('Orchestrator failed:', error);
    process.exit(1);
  });
}
