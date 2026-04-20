/**
 * Terminal-bench task interface matching the task.yaml schema.
 * See: https://github.com/harbor-framework/terminal-bench
 */
export interface TBenchTask {
  /** Unique identifier, e.g. "sysadmin__disk-usage-01" */
  taskId: string;
  /** English instruction for the agent */
  instruction: string;
  /** Category, e.g. "code-compilation", "sysadmin" */
  category: string;
  /** Difficulty level */
  difficulty: string;
  /** Tags for additional filtering */
  tags: string[];
  /** Max seconds the agent has to complete the task */
  maxAgentTimeoutSec: number;
  /** Max seconds for test validation */
  maxTestTimeoutSec: number;
  /** Parser for test output, e.g. "pytest" | "swebench" */
  parserName: string;
  /** Absolute path to task directory on disk */
  taskDir: string;
}
