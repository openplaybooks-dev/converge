/**
 * AI Context Tests
 *
 * Unit tests for the AI context layer.
 */

import { describe, it, expect, vi } from 'vitest';
import { AIContext, AIResponse } from '../../src/ai/context.ts';
import { z } from 'zod';

// Mock agentfn
vi.mock('@crew/agentfn', () => ({
  agentfn: vi.fn(() => async () => ({
    data: 'Test response',
    raw: 'Test response',
    durationMs: 1000,
    sessionId: 'test-session',
  })),
}));

// Mock agent-runner
vi.mock('../../src/repair/agent-runner.ts', () => ({
  runAgent: vi.fn(async () => ({
    data: 'Test response',
    raw: 'Test response',
    durationMs: 1000,
    sessionId: 'test-session',
  })),
  getAgentLogDir: vi.fn(() => '/tmp/logs'),
}));

describe('AIResponse', () => {
  it('should extract text from response', () => {
    const result = {
      data: 'Hello, world!',
      raw: 'Hello, world!',
      durationMs: 1000,
      sessionId: 'test',
    };

    const response = new AIResponse(result as any);
    expect(response.asText()).toBe('Hello, world!');
  });

  it('should extract JSON from markdown code block', () => {
    const result = {
      data: '```json\n{"foo": "bar"}\n```',
      raw: '```json\n{"foo": "bar"}\n```',
      durationMs: 1000,
      sessionId: 'test',
    };

    const response = new AIResponse(result as any);
    expect(response.asJson()).toEqual({ foo: 'bar' });
  });

  it('should extract JSON from plain text', () => {
    const result = {
      data: '{"foo": "bar"}',
      raw: '{"foo": "bar"}',
      durationMs: 1000,
      sessionId: 'test',
    };

    const response = new AIResponse(result as any);
    expect(response.asJson()).toEqual({ foo: 'bar' });
  });

  it('should parse boolean responses', () => {
    const yesResult = {
      data: 'Yes, this is correct.',
      raw: 'Yes, this is correct.',
      durationMs: 1000,
      sessionId: 'test',
    };

    const noResult = {
      data: 'No, this is not correct.',
      raw: 'No, this is not correct.',
      durationMs: 1000,
      sessionId: 'test',
    };

    expect(new AIResponse(yesResult as any).asBool()).toBe(true);
    expect(new AIResponse(noResult as any).asBool()).toBe(false);
  });

  it('should extract reasoning from structured response', () => {
    const result = {
      data: 'Reasoning: This is the reasoning.\n\nConclusion: Done.',
      raw: 'Reasoning: This is the reasoning.\n\nConclusion: Done.',
      durationMs: 1000,
      sessionId: 'test',
    };

    const response = new AIResponse(result as any);
    expect(response.getReasoning()).toBe('This is the reasoning.');
  });
});

describe('AIContext', () => {
  it('should create context with project directory', () => {
    const ai = new AIContext('/project', { epicId: 'epic1', taskId: 'task1' });
    expect(ai).toBeDefined();
  });

  it('should create child context with different journal', () => {
    const ai = new AIContext('/project', { epicId: 'epic1', taskId: 'task1' });
    const childAi = ai.withJournalContext({ epicId: 'epic2', taskId: 'task2' });
    expect(childAi).toBeDefined();
  });

  // Note: Full integration tests require mocking runAgent
  // which is complex due to agentfn dependencies
});
