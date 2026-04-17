/**
 * Tests for the SidecarRunner.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { SidecarRunner } from '../../src/sidecar/runner.ts';
import { HookRegistry } from '../../src/hooks/registry.ts';

describe('SidecarRunner', () => {
  let registry: HookRegistry;
  let runner: SidecarRunner;

  afterEach(() => {
    runner?.stopAll();
  });

  it('should register a sidecar and track it', async () => {
    registry = new HookRegistry();
    runner = new SidecarRunner(registry, '/tmp/test');

    await runner.start('git-checkpoint', {
      'task:complete': async () => {},
    });

    expect(runner.has('git-checkpoint')).toBe(true);
    expect(runner.list()).toContain('git-checkpoint');
  });

  it('should subscribe hooks to the registry', async () => {
    registry = new HookRegistry();
    runner = new SidecarRunner(registry, '/tmp/test');

    const hookFn = vi.fn(async () => {});

    await runner.start('test-sidecar', {
      'task:complete': hookFn,
    });

    // The hook should be registered
    expect(registry.has('task:complete')).toBe(true);
    expect(registry.count('task:complete')).toBe(1);
  });

  it('should throw on duplicate sidecar registration', async () => {
    registry = new HookRegistry();
    runner = new SidecarRunner(registry, '/tmp/test');

    await runner.start('dup', { 'task:complete': async () => {} });

    await expect(
      runner.start('dup', { 'task:complete': async () => {} })
    ).rejects.toThrow('already registered');
  });

  it('should fire sidecar hooks when events are emitted', async () => {
    registry = new HookRegistry();
    runner = new SidecarRunner(registry, '/tmp/test');

    let receivedTaskId: string | undefined;

    await runner.start('checker', {
      'task:complete': async (event: any, ctx: any) => {
        receivedTaskId = event.ctx?.taskId;
      },
    });

    // Fire the event through the registry
    await registry.fire('task:complete', {
      ctx: { taskId: 'test-task', epicId: 'epic-1' } as any,
      result: { success: true },
    });

    expect(receivedTaskId).toBe('test-task');
  });

  it('should provide shell function in sidecar context', async () => {
    registry = new HookRegistry();
    runner = new SidecarRunner(registry, '/tmp');

    let shellAvailable = false;

    await runner.start('shell-test', {
      'task:complete': async (_event: any, ctx: any) => {
        shellAvailable = typeof ctx.shell === 'function';
      },
    });

    await registry.fire('task:complete', {
      ctx: { taskId: 'x' } as any,
      result: { success: true },
    });

    expect(shellAvailable).toBe(true);
  });

  it('should provide emitGap/resolveGaps in sidecar context', async () => {
    registry = new HookRegistry();
    runner = new SidecarRunner(registry, '/tmp');

    let gapId: string | undefined;

    await runner.start('gap-test', {
      'task:complete': async (_event: any, ctx: any) => {
        gapId = ctx.emitGap({
          severity: 'high',
          description: 'Test gap',
          tags: ['test'],
        });
        ctx.resolveGaps('test');
      },
    });

    await registry.fire('task:complete', {
      ctx: { taskId: 'x' } as any,
      result: { success: true },
    });

    expect(gapId).toBeDefined();
    expect(gapId).toContain('sidecar-gap-test-gap-');
  });

  it('should stop and remove sidecar', async () => {
    registry = new HookRegistry();
    runner = new SidecarRunner(registry, '/tmp');

    await runner.start('temp', { 'task:complete': async () => {} });

    runner.stop('temp');

    expect(runner.has('temp')).toBe(false);
  });

  it('should stop all sidecars', async () => {
    registry = new HookRegistry();
    runner = new SidecarRunner(registry, '/tmp');

    await runner.start('a', { 'task:complete': async () => {} });
    await runner.start('b', { 'task:fail': async () => {} });

    runner.stopAll();

    expect(runner.list()).toEqual([]);
  });

  it('should run init .execute() if provided', async () => {
    registry = new HookRegistry();
    runner = new SidecarRunner(registry, '/tmp');

    const initFn = vi.fn(async () => {});

    await runner.start(
      'with-init',
      { 'task:complete': async () => {} },
      initFn,
      () => ({})
    );

    expect(initFn).toHaveBeenCalledTimes(1);
  });
});
