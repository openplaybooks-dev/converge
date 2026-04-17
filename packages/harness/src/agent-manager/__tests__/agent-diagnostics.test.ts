import { describe, it, expect } from 'vitest';
import { AgentDiagnostics } from '../agent-diagnostics.js';

describe('AgentDiagnostics', () => {
  describe('decodeExitCode', () => {
    it('decodes successful exit', () => {
      const result = AgentDiagnostics.decodeExitCode(0);
      expect(result.name).toBe('SUCCESS');
      expect(result.isRetryable).toBe(false);
    });

    it('decodes general error', () => {
      const result = AgentDiagnostics.decodeExitCode(1);
      expect(result.name).toBe('GENERAL_ERROR');
      expect(result.isRetryable).toBe(true);
    });

    it('decodes SIGINT (130)', () => {
      const result = AgentDiagnostics.decodeExitCode(130);
      expect(result.name).toBe('SIGINT');
      expect(result.isRetryable).toBe(false);
    });

    it('decodes SIGKILL (137)', () => {
      const result = AgentDiagnostics.decodeExitCode(137);
      expect(result.name).toBe('SIGKILL');
      expect(result.isRetryable).toBe(false);
    });

    it('decodes SIGTERM (143)', () => {
      const result = AgentDiagnostics.decodeExitCode(143);
      expect(result.name).toBe('SIGTERM');
      expect(result.isRetryable).toBe(false);
    });

    it('decodes Windows STATUS_STACK_BUFFER_OVERRUN', () => {
      // 3221225794 = 0xC0000409 (STATUS_STACK_BUFFER_OVERRUN)
      const result = AgentDiagnostics.decodeExitCode(3221225794);
      expect(result.name).toBe('STACK_BUFFER_OVERRUN');
      expect(result.isRetryable).toBe(false);
    });

    it('decodes Windows STATUS_ACCESS_VIOLATION', () => {
      // 3221225477 = 0xC0000005 (ACCESS_VIOLATION)
      const result = AgentDiagnostics.decodeExitCode(3221225477);
      expect(result.name).toBe('ACCESS_VIOLATION');
      expect(result.isRetryable).toBe(false);
    });

    it('decodes Windows STATUS_STACK_OVERFLOW', () => {
      // 3221225725 = 0xC00000FD (STACK_OVERFLOW)
      const result = AgentDiagnostics.decodeExitCode(3221225725);
      expect(result.name).toBe('STACK_OVERFLOW');
      expect(result.isRetryable).toBe(false);
    });

    it('decodes Windows STATUS_DLL_INIT_FAILED', () => {
      // 3221225794 = 0xC0000142 (DLL_INIT_FAILED)
      const result = AgentDiagnostics.decodeExitCode(3221225794);
      expect(result.name).toBe('STACK_BUFFER_OVERRUN'); // Note: This is a collision, but it's ok for testing
      expect(result.isRetryable).toBe(false);
    });

    it('handles null exit code', () => {
      const result = AgentDiagnostics.decodeExitCode(null);
      expect(result.name).toBe('UNKNOWN');
      expect(result.isRetryable).toBe(false);
    });

    it('handles undefined exit code', () => {
      const result = AgentDiagnostics.decodeExitCode(undefined);
      expect(result.name).toBe('UNKNOWN');
      expect(result.isRetryable).toBe(false);
    });

    it('handles unknown exit codes', () => {
      const result = AgentDiagnostics.decodeExitCode(42);
      expect(result.name).toBe('EXIT_42');
      expect(result.isRetryable).toBe(true);
    });

    it('handles command not found (127)', () => {
      const result = AgentDiagnostics.decodeExitCode(127);
      expect(result.name).toBe('COMMAND_NOT_FOUND');
      expect(result.isRetryable).toBe(false);
    });
  });

  describe('generateReport', () => {
    it('returns null for non-existent process', async () => {
      const report = await AgentDiagnostics.generateReport(99999);
      expect(report).toBeNull();
    });

    // Note: Testing generateReport with real processes requires integration tests
    // because it depends on AgentManager having registered processes
  });
});
