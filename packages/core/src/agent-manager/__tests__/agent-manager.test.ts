import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { AgentManager } from '../agent-manager.js';
import { unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

describe('AgentManager', () => {
  let manager: AgentManager;
  const stateFilePath = join(homedir(), '.converge', 'agent-registry.json');

  beforeEach(() => {
    // Clean up state file before each test
    if (existsSync(stateFilePath)) {
      unlinkSync(stateFilePath);
    }
    manager = AgentManager.getInstance();
  });

  afterEach(() => {
    // Clean up all processes after each test
    const processes = manager.getAllProcesses();
    for (const proc of processes) {
      try {
        process.kill(proc.pid, 'SIGKILL');
      } catch {
        // Process may already be dead
      }
    }
    manager.destroy();

    // Clean up state file
    if (existsSync(stateFilePath)) {
      unlinkSync(stateFilePath);
    }
  });

  it('registers and tracks agents by PID', async () => {
    const proc = spawn('sleep', ['1']);

    manager.register(proc, {
      sessionId: 'test-session-1',
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['1'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
      },
    });

    expect(manager.getProcess(proc.pid!)).toBeDefined();
    expect(manager.getProcess(proc.pid!)?.sessionId).toBe('test-session-1');

    proc.kill();
  });

  it('registers and tracks agents by sessionId', async () => {
    const proc = spawn('sleep', ['1']);

    manager.register(proc, {
      sessionId: 'test-session-2',
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['1'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
      },
    });

    expect(manager.getProcessBySession('test-session-2')).toBeDefined();
    expect(manager.getProcessBySession('test-session-2')?.pid).toBe(proc.pid);

    proc.kill();
  });

  it('detects hung agents', async () => {
    const proc = spawn('sleep', ['10']);

    manager.register(proc, {
      sessionId: 'test-session-3',
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['10'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
      },
    });

    // Simulate hung process by setting lastActivityAt to 6 minutes ago
    const info = manager.getProcess(proc.pid!);
    if (info) {
      info.lastActivityAt = Date.now() - (6 * 60 * 1000);
    }

    const hungProcesses = manager.getHungProcesses();
    expect(hungProcesses.length).toBe(1);
    expect(hungProcesses[0].pid).toBe(proc.pid);

    proc.kill();
  });

  it('handles rapid spawn/exit cycles', async () => {
    const processes = [];

    for (let i = 0; i < 5; i++) {
      const proc = spawn('echo', ['hello']);
      processes.push(proc);

      manager.register(proc, {
        sessionId: `test-session-${i}`,
        logPath: '/tmp/test.log',
        command: 'echo',
        args: ['hello'],
        cwd: process.cwd(),
        convergeMetadata: {
          projectDir: process.cwd(),
        },
      });
    }

    // Wait for all processes to exit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clean up dead processes
    manager.cleanupDeadProcesses();

    // All processes should be cleaned up
    expect(manager.getAllProcesses().length).toBe(0);
  });

  it('supports dual-index lookups (PID and sessionId)', async () => {
    const proc = spawn('sleep', ['1']);
    const sessionId = 'test-dual-index';

    manager.register(proc, {
      sessionId,
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['1'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
      },
    });

    // Should be able to access by both PID and sessionId
    const byPid = manager.getProcess(proc.pid!);
    const bySession = manager.getProcessBySession(sessionId);

    expect(byPid).toBeDefined();
    expect(bySession).toBeDefined();
    expect(byPid?.pid).toBe(bySession?.pid);
    expect(byPid?.sessionId).toBe(sessionId);

    proc.kill();
  });

  it('tracks converge metadata', async () => {
    const proc = spawn('sleep', ['1']);

    manager.register(proc, {
      sessionId: 'test-metadata',
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['1'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: '/test/project',
        epicId: 'epic-1',
        taskId: 'task-1',
        phase: 'execution',
        strategyType: 'task-run',
      },
    });

    const info = manager.getProcess(proc.pid!);
    expect(info?.convergeMetadata.epicId).toBe('epic-1');
    expect(info?.convergeMetadata.taskId).toBe('task-1');
    expect(info?.convergeMetadata.phase).toBe('execution');

    proc.kill();
  });

  it('provides task-specific agent queries', async () => {
    const proc1 = spawn('sleep', ['1']);
    const proc2 = spawn('sleep', ['1']);

    manager.register(proc1, {
      sessionId: 'test-query-1',
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['1'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
        taskId: 'task-1',
      },
    });

    manager.register(proc2, {
      sessionId: 'test-query-2',
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['1'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
        taskId: 'task-2',
      },
    });

    const task1Processes = manager.getProcessesByTask('task-1');
    expect(task1Processes.length).toBe(1);
    expect(task1Processes[0].pid).toBe(proc1.pid);

    proc1.kill();
    proc2.kill();
  });

  it('cleans up agents by task', async () => {
    const proc1 = spawn('sleep', ['10']);
    const proc2 = spawn('sleep', ['10']);

    manager.register(proc1, {
      sessionId: 'test-cleanup-task-1',
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['10'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
        taskId: 'cleanup-task-1',
      },
    });

    manager.register(proc2, {
      sessionId: 'test-cleanup-task-2',
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['10'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
        taskId: 'cleanup-task-2',
      },
    });

    await manager.cleanupTask('cleanup-task-1');

    // Wait for process to be killed
    await new Promise(resolve => setTimeout(resolve, 500));

    // Task 1 should be dead, task 2 should still be running
    const proc1Info = manager.getProcess(proc1.pid!);
    expect(proc1Info?.status).toBe('exiting');

    // Clean up remaining process
    proc2.kill();
  });

  it('cleans up agents by session', async () => {
    const proc = spawn('sleep', ['10']);
    const sessionId = 'test-cleanup-session';

    manager.register(proc, {
      sessionId,
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['10'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
      },
    });

    await manager.killSession(sessionId);

    // Wait for process to be killed
    await new Promise(resolve => setTimeout(resolve, 500));

    const info = manager.getProcessBySession(sessionId);
    expect(info?.status).toBe('exiting');
  });

  it('calculates metrics correctly', async () => {
    const proc1 = spawn('echo', ['test1']);
    const proc2 = spawn('sleep', ['10']);

    manager.register(proc1, {
      sessionId: 'metrics-1',
      logPath: '/tmp/test.log',
      command: 'echo',
      args: ['test1'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
        phase: 'analysis',
      },
    });

    manager.register(proc2, {
      sessionId: 'metrics-2',
      logPath: '/tmp/test.log',
      command: 'sleep',
      args: ['10'],
      cwd: process.cwd(),
      convergeMetadata: {
        projectDir: process.cwd(),
        phase: 'execution',
      },
    });

    // Wait for echo to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    const metrics = manager.getMetrics();
    expect(metrics.totalSpawned).toBe(2);
    expect(metrics.byPhase['analysis']).toBe(1);
    expect(metrics.byPhase['execution']).toBe(1);

    proc2.kill();
  });
});
