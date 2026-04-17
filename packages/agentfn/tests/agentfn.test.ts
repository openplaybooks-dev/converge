import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Mock claudefn package
vi.mock("claudefn", () => {
  const claudefn = vi.fn();
  const kimifn = vi.fn(); // not used but avoids import errors
  return {
    claudefn,
    compose: vi.fn(),
    agent: vi.fn(),
    extractJson: vi.fn((raw: string) => raw),
    resolvePrompt: vi.fn((t: string, i?: string) =>
      i ? t.replace(/\{\{input\}\}/g, i) : t,
    ),
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
  const kimifn = vi.fn();
  return {
    kimifn,
    compose: vi.fn(),
    extractJson: vi.fn((raw: string) => raw),
    resolvePrompt: vi.fn((t: string, i?: string) =>
      i ? t.replace(/\{\{input\}\}/g, i) : t,
    ),
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
  const qwenfn = vi.fn();
  return {
    qwenfn,
    compose: vi.fn(),
    extractJson: vi.fn((raw: string) => raw),
    resolvePrompt: vi.fn((t: string, i?: string) =>
      i ? t.replace(/\{\{input\}\}/g, i) : t,
    ),
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
  const geminifn = vi.fn();
  return {
    geminifn,
    compose: vi.fn(),
    extractJson: vi.fn((raw: string) => raw),
    resolvePrompt: vi.fn((t: string, i?: string) =>
      i ? t.replace(/\{\{input\}\}/g, i) : t,
    ),
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

// Import after mocking
const { claudefn: mockClaudefn } = await import("claudefn");
const { kimifn: mockKimifn } = await import("kimifn");
const { qwenfn: mockQwenfn } = await import("qwenfn");
const { geminifn: mockGeminifn } = await import("geminifn");
const { agentfn, setDefaultProvider } = await import("../src/index.js");

beforeEach(() => {
  vi.clearAllMocks();
  setDefaultProvider("claude");
});

// ─── Core API ───────────────────────────────────────────────

describe("agentfn — core API", () => {
  it("returns a callable function", () => {
    (mockClaudefn as any).mockReturnValue(async () => ({
      data: "hi",
      raw: "hi",
      durationMs: 10,
    }));

    const fn = agentfn({ prompt: "Say hello" });
    expect(typeof fn).toBe("function");
  });

  it("delegates to claudefn by default", () => {
    (mockClaudefn as any).mockReturnValue(async () => ({
      data: "hi",
      raw: "hi",
      durationMs: 10,
    }));

    agentfn({ prompt: "Say hello" });
    expect(mockClaudefn).toHaveBeenCalledOnce();
    expect(mockKimifn).not.toHaveBeenCalled();
  });

  it("delegates to kimifn when provider is kimi", () => {
    (mockKimifn as any).mockReturnValue(async () => ({
      data: "hi",
      raw: "hi",
      durationMs: 10,
    }));

    agentfn({ prompt: "Say hello", provider: "kimi" });
    expect(mockKimifn).toHaveBeenCalledOnce();
    expect(mockClaudefn).not.toHaveBeenCalled();
  });

  it("delegates to qwenfn when provider is qwen", () => {
    (mockQwenfn as any).mockReturnValue(async () => ({
      data: "hi",
      raw: "hi",
      durationMs: 10,
    }));

    agentfn({ prompt: "Say hello", provider: "qwen" });
    expect(mockQwenfn).toHaveBeenCalledOnce();
    expect(mockClaudefn).not.toHaveBeenCalled();
    expect(mockKimifn).not.toHaveBeenCalled();
  });

  it("delegates to geminifn when provider is gemini", () => {
    (mockGeminifn as any).mockReturnValue(async () => ({
      data: "hi",
      raw: "hi",
      durationMs: 10,
    }));

    agentfn({ prompt: "Say hello", provider: "gemini" });
    expect(mockGeminifn).toHaveBeenCalledOnce();
    expect(mockClaudefn).not.toHaveBeenCalled();
    expect(mockKimifn).not.toHaveBeenCalled();
    expect(mockQwenfn).not.toHaveBeenCalled();
  });

  it("returns result with provider field set to claude", async () => {
    const mockFn = vi.fn(async () => ({
      data: "Hello from Claude",
      raw: "Hello from Claude",
      durationMs: 42,
    }));
    (mockClaudefn as any).mockReturnValue(mockFn);

    const fn = agentfn({ prompt: "Say hello" });
    const result = await fn();

    expect(result).toEqual({
      data: "Hello from Claude",
      raw: "Hello from Claude",
      durationMs: 42,
      provider: "claude",
    });
  });

  it("returns result with provider field set to kimi", async () => {
    const mockFn = vi.fn(async () => ({
      data: "Hello from Kimi",
      raw: "Hello from Kimi",
      durationMs: 55,
    }));
    (mockKimifn as any).mockReturnValue(mockFn);

    const fn = agentfn({ prompt: "Say hello", provider: "kimi" });
    const result = await fn();

    expect(result).toEqual({
      data: "Hello from Kimi",
      raw: "Hello from Kimi",
      durationMs: 55,
      provider: "kimi",
    });
  });

  it("returns result with provider field set to qwen", async () => {
    const mockFn = vi.fn(async () => ({
      data: "Hello from Qwen",
      raw: "Hello from Qwen",
      durationMs: 60,
    }));
    (mockQwenfn as any).mockReturnValue(mockFn);

    const fn = agentfn({ prompt: "Say hello", provider: "qwen" });
    const result = await fn();

    expect(result).toEqual({
      data: "Hello from Qwen",
      raw: "Hello from Qwen",
      durationMs: 60,
      provider: "qwen",
    });
  });

  it("returns result with provider field set to gemini", async () => {
    const mockFn = vi.fn(async () => ({
      data: "Hello from Gemini",
      raw: "Hello from Gemini",
      durationMs: 45,
    }));
    (mockGeminifn as any).mockReturnValue(mockFn);

    const fn = agentfn({ prompt: "Say hello", provider: "gemini" });
    const result = await fn();

    expect(result).toEqual({
      data: "Hello from Gemini",
      raw: "Hello from Gemini",
      durationMs: 45,
      provider: "gemini",
    });
  });

  it("passes input through to the underlying function", async () => {
    const mockFn = vi.fn(async () => ({
      data: "result",
      raw: "result",
      durationMs: 10,
    }));
    (mockClaudefn as any).mockReturnValue(mockFn);

    const fn = agentfn({ prompt: "Translate {{input}}" });
    await fn("hello");

    expect(mockFn).toHaveBeenCalledWith("hello");
  });
});

// ─── Options Forwarding ─────────────────────────────────────

describe("agentfn — options forwarding", () => {
  it("forwards shared options to claudefn", () => {
    (mockClaudefn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    agentfn({
      prompt: "test",
      timeoutMs: 5000,
      maxRetries: 3,
      cwd: "/tmp",
      cliFlags: ["--model", "opus"],
    });

    expect(mockClaudefn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "test",
        timeoutMs: 5000,
        maxRetries: 3,
        cwd: "/tmp",
        cliFlags: ["--model", "opus"],
      }),
    );
  });

  it("forwards shared options to kimifn", () => {
    (mockKimifn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    agentfn({
      prompt: "test",
      provider: "kimi",
      timeoutMs: 5000,
      maxRetries: 3,
      cwd: "/tmp",
      cliFlags: ["--model", "moonshot"],
    });

    expect(mockKimifn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "test",
        timeoutMs: 5000,
        maxRetries: 3,
        cwd: "/tmp",
        cliFlags: ["--model", "moonshot"],
      }),
    );
  });

  it("forwards claude-only options to claudefn", () => {
    (mockClaudefn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    agentfn({
      prompt: "test",
      backend: "sdk",
      model: "opus",
      allowedTools: ["Read", "Edit"],
      permissionMode: "acceptEdits",
      maxTurns: 20,
      systemPrompt: "You are helpful",
    });

    expect(mockClaudefn).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: "sdk",
        model: "opus",
        allowedTools: ["Read", "Edit"],
        permissionMode: "acceptEdits",
        maxTurns: 20,
        systemPrompt: "You are helpful",
      }),
    );
  });

  it("does not pass claude-only options to kimifn", () => {
    (mockKimifn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    agentfn({
      prompt: "test",
      provider: "kimi",
      backend: "sdk",
      model: "opus",
      allowedTools: ["Read"],
    });

    const calledWith = (mockKimifn as any).mock.calls[0][0];
    expect(calledWith).not.toHaveProperty("backend");
    expect(calledWith).not.toHaveProperty("model");
    expect(calledWith).not.toHaveProperty("allowedTools");
  });

  it("forwards shared options to qwenfn", () => {
    (mockQwenfn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    agentfn({
      prompt: "test",
      provider: "qwen",
      timeoutMs: 5000,
      maxRetries: 3,
      cwd: "/tmp",
      cliFlags: ["--model", "qwen-max"],
    });

    expect(mockQwenfn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "test",
        timeoutMs: 5000,
        maxRetries: 3,
        cwd: "/tmp",
        cliFlags: ["--model", "qwen-max"],
      }),
    );
  });

  it("does not pass claude-only options to qwenfn", () => {
    (mockQwenfn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    agentfn({
      prompt: "test",
      provider: "qwen",
      backend: "sdk",
      model: "opus",
      allowedTools: ["Read"],
    });

    const calledWith = (mockQwenfn as any).mock.calls[0][0];
    expect(calledWith).not.toHaveProperty("backend");
    expect(calledWith).not.toHaveProperty("model");
    expect(calledWith).not.toHaveProperty("allowedTools");
  });

  it("forwards shared options to geminifn", () => {
    (mockGeminifn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    agentfn({
      prompt: "test",
      provider: "gemini",
      timeoutMs: 5000,
      maxRetries: 3,
      cwd: "/tmp",
      cliFlags: ["--model", "gemini-2.5-pro"],
    });

    expect(mockGeminifn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "test",
        timeoutMs: 5000,
        maxRetries: 3,
        cwd: "/tmp",
        cliFlags: ["--model", "gemini-2.5-pro"],
      }),
    );
  });

  it("does not pass claude-only options to geminifn", () => {
    (mockGeminifn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    agentfn({
      prompt: "test",
      provider: "gemini",
      backend: "sdk",
      model: "opus",
      allowedTools: ["Read"],
    });

    const calledWith = (mockGeminifn as any).mock.calls[0][0];
    expect(calledWith).not.toHaveProperty("backend");
    expect(calledWith).not.toHaveProperty("model");
    expect(calledWith).not.toHaveProperty("allowedTools");
  });

  it("forwards hooks to the underlying provider", () => {
    const hooks = {
      before: vi.fn(),
      after: vi.fn(),
      onStream: vi.fn(),
    };
    (mockClaudefn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    agentfn({ prompt: "test", hooks });

    expect(mockClaudefn).toHaveBeenCalledWith(
      expect.objectContaining({ hooks }),
    );
  });

  it("forwards schema to the underlying provider", () => {
    const schema = z.object({ name: z.string() });
    (mockClaudefn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    agentfn({ prompt: "test", schema });

    expect(mockClaudefn).toHaveBeenCalledWith(
      expect.objectContaining({ schema }),
    );
  });
});

// ─── Default Provider ───────────────────────────────────────

describe("agentfn — default provider", () => {
  it("uses global default provider when none specified", () => {
    (mockKimifn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    setDefaultProvider("kimi");
    agentfn({ prompt: "test" });

    expect(mockKimifn).toHaveBeenCalledOnce();
    expect(mockClaudefn).not.toHaveBeenCalled();
  });

  it("explicit provider overrides global default", () => {
    (mockClaudefn as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    setDefaultProvider("kimi");
    agentfn({ prompt: "test", provider: "claude" });

    expect(mockClaudefn).toHaveBeenCalledOnce();
    expect(mockKimifn).not.toHaveBeenCalled();
  });
});

// ─── Stream Mode ────────────────────────────────────────────

describe("agentfn — stream mode", () => {
  it("delegates stream mode to claudefn", () => {
    const mockSession = { sessionId: "", send: vi.fn(), stream: vi.fn() };
    const mockStreamFn = vi.fn(() => mockSession);
    (mockClaudefn as any).mockReturnValue(mockStreamFn);

    agentfn({ prompt: "Fix the bug", mode: "stream" });

    expect(mockClaudefn).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "stream" }),
    );
  });

  it("throws when stream mode is used with kimi provider", () => {
    expect(() =>
      agentfn({ prompt: "test", mode: "stream", provider: "kimi" }),
    ).toThrow(/stream mode.*not supported.*kimi/i);
  });

  it("throws when stream mode is used with qwen provider", () => {
    expect(() =>
      agentfn({ prompt: "test", mode: "stream", provider: "qwen" }),
    ).toThrow(/stream mode.*not supported.*qwen/i);
  });

  it("throws when stream mode is used with gemini provider", () => {
    expect(() =>
      agentfn({ prompt: "test", mode: "stream", provider: "gemini" }),
    ).toThrow(/stream mode.*not supported.*gemini/i);
  });
});

// ─── Promptless Usage ───────────────────────────────────────

describe("agentfn — promptless usage", () => {
  it("works without a prompt option", () => {
    (mockClaudefn as any).mockReturnValue(async () => ({
      data: "result",
      raw: "result",
      durationMs: 10,
    }));

    const fn = agentfn();
    expect(typeof fn).toBe("function");
    expect(mockClaudefn).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: undefined }),
    );
  });
});

// ─── Claude SDK Result Fields ───────────────────────────────

describe("agentfn — SDK result fields", () => {
  it("preserves sessionId, costUsd, numTurns from claude SDK", async () => {
    const mockFn = vi.fn(async () => ({
      data: "done",
      raw: "done",
      durationMs: 100,
      sessionId: "sess-123",
      costUsd: 0.05,
      numTurns: 3,
    }));
    (mockClaudefn as any).mockReturnValue(mockFn);

    const fn = agentfn({ prompt: "test", backend: "sdk" });
    const result = await fn();

    expect(result.provider).toBe("claude");
    expect(result.sessionId).toBe("sess-123");
    expect(result.costUsd).toBe(0.05);
    expect(result.numTurns).toBe(3);
  });
});
