import type { ConvergeConfig } from "../config/types.ts";
import type { HookRegistry } from "../hooks/registry.ts";

export interface AutonomousRunOptions {
  projectDir: string;
  convergeConfig: ConvergeConfig;
  hookRegistry?: HookRegistry;
  maxIterations?: number;
  maxTaskAttempts?: number;
  maxRunDurationMs?: number;
  verbose?: boolean;
  filter?: string;
  force?: boolean;
  resume?: boolean;
  restart?: boolean;
}

export interface AutonomousRunResult {
  tasksCompleted: number;
  tasksFailed: number;
  completed: boolean;
  stoppedReason?: string;
}

export async function autonomousRun(
  _opts: AutonomousRunOptions,
): Promise<AutonomousRunResult> {
  return { tasksCompleted: 0, tasksFailed: 0, completed: true };
}
