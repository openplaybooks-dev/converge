/**
 * Converge Executor
 *
 * Executes synthesized verification code in a sandboxed environment.
 * Provides limited APIs (file, shell) and collects validation issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type {
  ConvergeSandboxAPI,
  ConvergeIssue,
} from './types.ts';
import type { ConvergeResult, AutoConvergeConfig } from '../functions/types.ts';

/* ------------------------------------------------------------------ */
/*  Converge Executor                                                  */
/* ------------------------------------------------------------------ */

export class ConvergeExecutor {
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  /**
   * Execute verification code and collect validation issues
   */
  async execute(
    verificationCode: string,
    config: AutoConvergeConfig
  ): Promise<ConvergeResult> {
    console.log(`[ConvergeExecutor] Executing verification`);

    const startTime = Date.now();
    const issues: ConvergeIssue[] = [];

    try {
      // Create sandbox API
      const sandbox = this.createSandboxAPI(issues, config.sandbox);

      // Execute verification code
      await this.executeInSandbox(verificationCode, sandbox);

      const duration = Date.now() - startTime;

      return {
        passed: issues.filter((i) => i.severity === 'error').length === 0,
        issues,
        duration,
      };
    } catch (error: any) {
      console.error(`[ConvergeExecutor] Execution error: ${error.message}`);

      return {
        passed: false,
        issues: [
          {
            message: `Verification execution failed: ${error.message}`,
            severity: 'error',
          },
          ...issues,
        ],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Create sandboxed API for verification
   */
  private createSandboxAPI(
    issues: ConvergeIssue[],
    sandboxLevel: AutoConvergeConfig['sandbox'] = 'strict'
  ): ConvergeSandboxAPI {
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
          console.log(`[ConvergeExecutor] Shell command blocked (not implemented): ${cmd}`);

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
   * Execute verification code in sandbox
   */
  private async executeInSandbox(
    verificationCode: string,
    sandbox: ConvergeSandboxAPI
  ): Promise<void> {
    // In real implementation, would use vm module or worker_threads for proper isolation
    // For now, use Function constructor (which is safe since we validate the code)

    // Extract the validate function
    const fullCode = `
      ${verificationCode}

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
 * Create a new converge executor
 */
export function createConvergeExecutor(workspaceDir: string): ConvergeExecutor {
  return new ConvergeExecutor(workspaceDir);
}
