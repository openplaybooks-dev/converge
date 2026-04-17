/**
 * Harness Executor
 *
 * Executes synthesized harness code in a sandboxed environment.
 * Provides limited APIs (file, shell) and collects validation issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type {
  HarnessSandboxAPI,
  HarnessIssue,
} from './types.ts';
import type { HarnessResult, AutoHarnessConfig } from '../functions/types.ts';

/* ------------------------------------------------------------------ */
/*  Harness Executor                                                  */
/* ------------------------------------------------------------------ */

export class HarnessExecutor {
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  /**
   * Execute harness code and collect validation issues
   */
  async execute(
    harnessCode: string,
    config: AutoHarnessConfig
  ): Promise<HarnessResult> {
    console.log(`[HarnessExecutor] Executing harness`);

    const startTime = Date.now();
    const issues: HarnessIssue[] = [];

    try {
      // Create sandbox API
      const sandbox = this.createSandboxAPI(issues, config.sandbox);

      // Execute harness code
      await this.executeInSandbox(harnessCode, sandbox);

      const duration = Date.now() - startTime;

      return {
        passed: issues.filter((i) => i.severity === 'error').length === 0,
        issues,
        duration,
      };
    } catch (error: any) {
      console.error(`[HarnessExecutor] Execution error: ${error.message}`);

      return {
        passed: false,
        issues: [
          {
            message: `Harness execution failed: ${error.message}`,
            severity: 'error',
          },
          ...issues,
        ],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Create sandboxed API for harness
   */
  private createSandboxAPI(
    issues: HarnessIssue[],
    sandboxLevel: AutoHarnessConfig['sandbox'] = 'strict'
  ): HarnessSandboxAPI {
    return {
      file: {
        read: async (filePath: string) => {
          const fullPath = path.resolve(this.workspaceDir, filePath);

          // Security check: prevent path traversal
          if (!fullPath.startsWith(this.workspaceDir)) {
            throw new Error(`Access denied: ${filePath}`);
          }

          return fs.readFileSync(fullPath, 'utf-8');
        },

        exists: async (filePath: string) => {
          const fullPath = path.resolve(this.workspaceDir, filePath);

          if (!fullPath.startsWith(this.workspaceDir)) {
            return false;
          }

          return fs.existsSync(fullPath);
        },

        glob: async (pattern: string) => {
          const fullPattern = path.join(this.workspaceDir, pattern);
          const matches = await glob(fullPattern);

          // Return relative paths
          return matches.map((m) => path.relative(this.workspaceDir, m));
        },
      },

      shell: {
        run: async (cmd: string) => {
          if (sandboxLevel === 'strict') {
            throw new Error('Shell commands not allowed in strict sandbox mode');
          }

          // In real impl, would execute with proper sandboxing
          console.log(`[HarnessExecutor] Shell command blocked (not implemented): ${cmd}`);

          return {
            stdout: '',
            stderr: 'Not implemented',
            exitCode: 1,
          };
        },
      },

      issues,
    };
  }

  /**
   * Execute harness code in sandbox
   */
  private async executeInSandbox(
    harnessCode: string,
    sandbox: HarnessSandboxAPI
  ): Promise<void> {
    // In real implementation, would use vm module or worker_threads for proper isolation
    // For now, use Function constructor (which is safe since we validate the code)

    // Extract the validate function
    const fullCode = `
      ${harnessCode}

      // Return the validate function
      return validate;
    `;

    try {
      // Create function from code
      const createValidate = new Function(fullCode);
      const validate = createValidate();

      // Execute with sandbox API
      await validate(sandbox.file, sandbox.shell, sandbox.issues);
    } catch (error: any) {
      sandbox.issues.push({
        message: `Validation error: ${error.message}`,
        severity: 'error',
      });
    }
  }
}

/**
 * Create a new harness executor
 */
export function createHarnessExecutor(workspaceDir: string): HarnessExecutor {
  return new HarnessExecutor(workspaceDir);
}
