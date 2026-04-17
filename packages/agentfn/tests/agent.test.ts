import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock claudefn package
vi.mock("claudefn", () => {
  return {
    claudefn: vi.fn(),
    compose: vi.fn(),
    agent: vi.fn(),
    extractJson: vi.fn((raw: string) => raw),
    resolvePrompt: vi.fn(),
    GlobalQueue: class {},
    getDefaultQueue: vi.fn(),
    setDefaultQueue: vi.fn(),
    parseToolCalls: vi.fn(),
    buildToolPreamble: vi.fn(),
    buildCodePreamble: vi.fn(),
    extractCode: vi.fn(),
    executeCode: vi.fn(),
  };
});

// Mock kimifn package
vi.mock("kimifn", () => {
  return {
    kimifn: vi.fn(),
    compose: vi.fn(),
    extractJson: vi.fn(),
    resolvePrompt: vi.fn(),
    GlobalQueue: class {},
    getDefaultQueue: vi.fn(),
    setDefaultQueue: vi.fn(),
    parseToolCalls: vi.fn(),
    buildToolPreamble: vi.fn(),
    buildCodePreamble: vi.fn(),
    extractCode: vi.fn(),
    executeCode: vi.fn(),
  };
});

// Mock qwenfn package
vi.mock("qwenfn", () => {
  return {
    qwenfn: vi.fn(),
    compose: vi.fn(),
    extractJson: vi.fn(),
    resolvePrompt: vi.fn(),
    GlobalQueue: class {},
    getDefaultQueue: vi.fn(),
    setDefaultQueue: vi.fn(),
    parseToolCalls: vi.fn(),
    buildToolPreamble: vi.fn(),
    buildCodePreamble: vi.fn(),
    extractCode: vi.fn(),
    executeCode: vi.fn(),
  };
});

// Mock geminifn package
vi.mock("geminifn", () => {
  return {
    geminifn: vi.fn(),
    compose: vi.fn(),
    extractJson: vi.fn(),
    resolvePrompt: vi.fn(),
    GlobalQueue: class {},
    getDefaultQueue: vi.fn(),
    setDefaultQueue: vi.fn(),
    parseToolCalls: vi.fn(),
    buildToolPreamble: vi.fn(),
    buildCodePreamble: vi.fn(),
    extractCode: vi.fn(),
    executeCode: vi.fn(),
  };
});

const { agent: mockClaudeAgent } = await import("claudefn");
const { agent, setDefaultProvider } = await import("../src/index.js");

beforeEach(() => {
  vi.clearAllMocks();
  setDefaultProvider("claude");
});

// ─── Core API ───────────────────────────────────────────────

describe("agent — core API", () => {
  it("delegates to claudefn agent", () => {
    const mockAgentFn = vi.fn(async () => ({
      data: "done",
      raw: "done",
      durationMs: 100,
      numTurns: 3,
      costUsd: 0.05,
      sessionId: "sess-1",
    }));
    (mockClaudeAgent as any).mockReturnValue(mockAgentFn);

    const fn = agent({ prompt: "Fix the bug in {{input}}" });
    expect(typeof fn).toBe("function");
    expect(mockClaudeAgent).toHaveBeenCalledOnce();
  });

  it("passes options through to claudefn agent", () => {
    (mockClaudeAgent as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
      numTurns: 0,
      costUsd: 0,
      sessionId: "",
    }));

    agent({
      prompt: "Fix {{input}}",
      allowedTools: ["Read", "Edit", "Bash"],
      permissionMode: "acceptEdits",
      model: "opus",
      maxTurns: 20,
      systemPrompt: "Be helpful",
      timeoutMs: 60_000,
      maxRetries: 2,
      cwd: "/tmp",
    });

    expect(mockClaudeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Fix {{input}}",
        allowedTools: ["Read", "Edit", "Bash"],
        permissionMode: "acceptEdits",
        model: "opus",
        maxTurns: 20,
        systemPrompt: "Be helpful",
        timeoutMs: 60_000,
        maxRetries: 2,
        cwd: "/tmp",
      }),
    );
  });

  it("strips provider field before passing to claudefn agent", () => {
    (mockClaudeAgent as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
      numTurns: 0,
      costUsd: 0,
      sessionId: "",
    }));

    agent({ prompt: "test", provider: "claude" });

    const calledWith = (mockClaudeAgent as any).mock.calls[0][0];
    expect(calledWith).not.toHaveProperty("provider");
  });

  it("returns the result from claudefn agent", async () => {
    const mockAgentFn = vi.fn(async () => ({
      data: "Fixed the bug",
      raw: "Fixed the bug",
      durationMs: 2000,
      numTurns: 5,
      costUsd: 0.12,
      sessionId: "sess-abc",
    }));
    (mockClaudeAgent as any).mockReturnValue(mockAgentFn);

    const fn = agent({ prompt: "Fix it" });
    const result = await fn("auth.py");

    expect(result).toEqual({
      data: "Fixed the bug",
      raw: "Fixed the bug",
      durationMs: 2000,
      numTurns: 5,
      costUsd: 0.12,
      sessionId: "sess-abc",
    });
  });
});

// ─── Kimi Provider Error ────────────────────────────────────

describe("agent — kimi provider", () => {
  it("throws when provider is kimi", () => {
    expect(() =>
      agent({ prompt: "test", provider: "kimi" }),
    ).toThrow(/agent.*not supported.*kimi/i);
  });

  it("throws when default provider is kimi", () => {
    setDefaultProvider("kimi");
    expect(() => agent({ prompt: "test" })).toThrow(
      /agent.*not supported.*kimi/i,
    );
  });

  it("error message suggests alternatives", () => {
    expect(() =>
      agent({ prompt: "test", provider: "kimi" }),
    ).toThrow(/agentfn\(\)|compose\(\)/);
  });
});

// ─── Qwen Provider Error ────────────────────────────────────

describe("agent — qwen provider", () => {
  it("throws when provider is qwen", () => {
    expect(() =>
      agent({ prompt: "test", provider: "qwen" }),
    ).toThrow(/agent.*not supported.*qwen/i);
  });

  it("throws when default provider is qwen", () => {
    setDefaultProvider("qwen");
    expect(() => agent({ prompt: "test" })).toThrow(
      /agent.*not supported.*qwen/i,
    );
  });

  it("error message suggests alternatives", () => {
    expect(() =>
      agent({ prompt: "test", provider: "qwen" }),
    ).toThrow(/agentfn\(\)|compose\(\)/);
  });
});

// ─── Gemini Provider Error ─────────────────────────────────

describe("agent — gemini provider", () => {
  it("throws when provider is gemini", () => {
    expect(() =>
      agent({ prompt: "test", provider: "gemini" }),
    ).toThrow(/agent.*not supported.*gemini/i);
  });

  it("throws when default provider is gemini", () => {
    setDefaultProvider("gemini");
    expect(() => agent({ prompt: "test" })).toThrow(
      /agent.*not supported.*gemini/i,
    );
  });

  it("error message suggests alternatives", () => {
    expect(() =>
      agent({ prompt: "test", provider: "gemini" }),
    ).toThrow(/agentfn\(\)|compose\(\)/);
  });
});

// ─── Advanced Options ───────────────────────────────────────

describe("agent — advanced options", () => {
  it("passes MCP servers config", () => {
    (mockClaudeAgent as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
      numTurns: 0,
      costUsd: 0,
      sessionId: "",
    }));

    agent({
      prompt: "test",
      mcpServers: {
        myServer: { command: "npx", args: ["my-mcp-server"] },
      },
    });

    expect(mockClaudeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpServers: {
          myServer: { command: "npx", args: ["my-mcp-server"] },
        },
      }),
    );
  });

  it("passes subagent definitions", () => {
    (mockClaudeAgent as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
      numTurns: 0,
      costUsd: 0,
      sessionId: "",
    }));

    agent({
      prompt: "test",
      agents: {
        researcher: {
          description: "Research agent",
          prompt: "Research thoroughly",
          tools: ["Read", "Grep"],
        },
      },
    });

    expect(mockClaudeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        agents: {
          researcher: {
            description: "Research agent",
            prompt: "Research thoroughly",
            tools: ["Read", "Grep"],
          },
        },
      }),
    );
  });

  it("passes resume session ID", () => {
    (mockClaudeAgent as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
      numTurns: 0,
      costUsd: 0,
      sessionId: "",
    }));

    agent({ prompt: "continue", resume: "prev-session-id" });

    expect(mockClaudeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ resume: "prev-session-id" }),
    );
  });

  it("passes effort and maxBudgetUsd", () => {
    (mockClaudeAgent as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
      numTurns: 0,
      costUsd: 0,
      sessionId: "",
    }));

    agent({ prompt: "test", effort: "high", maxBudgetUsd: 1.0 });

    expect(mockClaudeAgent).toHaveBeenCalledWith(
      expect.objectContaining({ effort: "high", maxBudgetUsd: 1.0 }),
    );
  });
});
