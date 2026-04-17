#!/usr/bin/env node
/**
 * Converge Run Command
 *
 * Executes project.ts with full AI autonomy:
 * - AI discovers and executes tasks
 * - AI modifies code when needed
 * - AI adds/updates tasks dynamically
 * - AI debugs and self-corrects
 *
 * Usage:
 *   crew run project.ts
 *   crew run project.ts --watch
 *   crew run project.ts --max=50
 */

import { runAutonomousOrchestrator } from './skills/autonomous-orchestrator.ts';

async function main() {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║              Converge - Autonomous AI Orchestrator            ║
╚════════════════════════════════════════════════════════════╝

Usage:
  crew run <project-file> [options]

Options:
  --watch           Watch mode (restart on file changes)
  --max=<N>         Maximum iterations (default: 100)
  --help, -h        Show this help

Examples:
  crew run project.ts
  crew run project.ts --max=50
  crew run project.ts --watch

What happens when you run:
  1. 🤖 AI discovers tasks from .converge/tasks/
  2. ⚡ AI executes each task with real-time output
  3. ✅ AI validates outputs with AutoConverge
  4. 🔍 AI detects gaps and creates new tasks
  5. 🔄 AI self-corrects on failures
  6. 📝 AI modifies code directly when needed
  7. ↻  Repeats until all tasks converge

The AI is fully autonomous - it runs everything!
`);
    process.exit(0);
  }

  // Get project file
  const projectFile = args.find((arg) => !arg.startsWith('--')) || 'project.ts';

  // Parse options
  const watch = args.includes('--watch');
  const maxArg = args.find((arg) => arg.startsWith('--max='));
  const maxIterations = maxArg ? parseInt(maxArg.split('=')[1]) : 100;

  console.log(`
╔════════════════════════════════════════════════════════════╗
║         🤖 Autonomous AI Orchestrator Starting...         ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    await runAutonomousOrchestrator(projectFile, {
      watch,
      maxIterations,
    });
  } catch (error: any) {
    console.error('\n❌ Orchestrator failed:', error.message);
    process.exit(1);
  }
}

main();
