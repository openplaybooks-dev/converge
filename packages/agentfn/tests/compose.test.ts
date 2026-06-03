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

// Mock qwenfn package
vi.mock("qwenfn", () => {
  return {
    qwenfn: vi.fn(),
    compose: vi.fn(),
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

// Mock geminifn package
vi.mock("geminifn", () => {
  return {
    geminifn: vi.fn(),
    compose: vi.fn(),
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

const { compose: mockClaudeCompose } = await import("claudefn");
const { compose: mockKimiCompose } = await import("kimifn");
const { compose: mockQwenCompose } = await import("qwenfn");
const { compose: mockGeminiCompose } = await import("geminifn");
const { compose, setDefaultProvider } = await import("../src/index.js");

beforeEach(() => {
  vi.clearAllMocks();
  setDefaultProvider("claude");
});

// ─── Core API ───────────────────────────────────────────────

describe("compose — core API", () => {
  it("returns a callable function", () => {
    (mockClaudeCompose as any).mockReturnValue(async () => ({
      data: "result",
      raw: "result",
      durationMs: 10,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "claude" as const,
      }),
      description: "test tool",
    };

    const fn = compose({
      prompt: "test",
      tools: { tool1: dummyTool },
    });
    expect(typeof fn).toBe("function");
  });

  it("delegates to claudefn compose by default", async () => {
    (mockClaudeCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "claude" as const,
      }),
      description: "test",
    };

    const fn = compose({ prompt: "test", tools: { t: dummyTool } });
    await fn();
    expect(mockClaudeCompose).toHaveBeenCalledOnce();
    expect(mockKimiCompose).not.toHaveBeenCalled();
  });

  it("delegates to kimifn compose when provider is kimi", async () => {
    (mockKimiCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "kimi" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      provider: "kimi",
    });
    await fn();
    expect(mockKimiCompose).toHaveBeenCalledOnce();
    expect(mockClaudeCompose).not.toHaveBeenCalled();
  });

  it("delegates to qwenfn compose when provider is qwen", async () => {
    (mockQwenCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "qwen" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      provider: "qwen",
    });
    await fn();
    expect(mockQwenCompose).toHaveBeenCalledOnce();
    expect(mockClaudeCompose).not.toHaveBeenCalled();
    expect(mockKimiCompose).not.toHaveBeenCalled();
  });

  it("delegates to geminifn compose when provider is gemini", async () => {
    (mockGeminiCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "gemini" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      provider: "gemini",
    });
    await fn();
    expect(mockGeminiCompose).toHaveBeenCalledOnce();
    expect(mockClaudeCompose).not.toHaveBeenCalled();
    expect(mockKimiCompose).not.toHaveBeenCalled();
    expect(mockQwenCompose).not.toHaveBeenCalled();
  });
});

// ─── Result Augmentation ────────────────────────────────────

describe("compose — result augmentation", () => {
  it("adds provider: claude to the result", async () => {
    const innerFn = vi.fn(async () => ({
      data: "composed result",
      raw: "composed result",
      durationMs: 50,
    }));
    (mockClaudeCompose as any).mockReturnValue(innerFn);

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "claude" as const,
      }),
      description: "test",
    };

    const fn = compose({ prompt: "test", tools: { t: dummyTool } });
    const result = await fn("input");

    expect(result.provider).toBe("claude");
    expect(result.data).toBe("composed result");
    expect(result.durationMs).toBe(50);
  });

  it("adds provider: kimi to the result", async () => {
    const innerFn = vi.fn(async () => ({
      data: "kimi composed",
      raw: "kimi composed",
      durationMs: 30,
    }));
    (mockKimiCompose as any).mockReturnValue(innerFn);

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "kimi" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      provider: "kimi",
    });
    const result = await fn("input");

    expect(result.provider).toBe("kimi");
    expect(result.data).toBe("kimi composed");
  });

  it("adds provider: qwen to the result", async () => {
    const innerFn = vi.fn(async () => ({
      data: "qwen composed",
      raw: "qwen composed",
      durationMs: 25,
    }));
    (mockQwenCompose as any).mockReturnValue(innerFn);

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "qwen" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      provider: "qwen",
    });
    const result = await fn("input");

    expect(result.provider).toBe("qwen");
    expect(result.data).toBe("qwen composed");
  });

  it("adds provider: gemini to the result", async () => {
    const innerFn = vi.fn(async () => ({
      data: "gemini composed",
      raw: "gemini composed",
      durationMs: 35,
    }));
    (mockGeminiCompose as any).mockReturnValue(innerFn);

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "gemini" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      provider: "gemini",
    });
    const result = await fn("input");

    expect(result.provider).toBe("gemini");
    expect(result.data).toBe("gemini composed");
  });
});

// ─── Options Forwarding ─────────────────────────────────────

describe("compose — options forwarding", () => {
  it("forwards shared options to claude compose", async () => {
    (mockClaudeCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "claude" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "orchestrate",
      tools: { t: dummyTool },
      composeMode: "tool_call",
      timeoutMs: 60_000,
      maxRetries: 2,
      maxIterations: 5,
      cwd: "/tmp",
    });
    await fn();

    expect(mockClaudeCompose).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "orchestrate",
        composeMode: "tool_call",
        timeoutMs: 60_000,
        maxRetries: 2,
        maxIterations: 5,
        cwd: "/tmp",
      }),
    );
  });

  it("forwards shared options to kimi compose", async () => {
    (mockKimiCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "kimi" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "orchestrate",
      tools: { t: dummyTool },
      provider: "kimi",
      composeMode: "code",
      timeoutMs: 30_000,
      maxIterations: 3,
    });
    await fn();

    expect(mockKimiCompose).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "orchestrate",
        composeMode: "code",
        timeoutMs: 30_000,
        maxIterations: 3,
      }),
    );
  });

  it("forwards claude-only options to claude compose", async () => {
    (mockClaudeCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "claude" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      backend: "sdk",
      model: "opus",
      allowedTools: ["Bash"],
      permissionMode: "acceptEdits",
      systemPrompt: "Be concise",
    });
    await fn();

    expect(mockClaudeCompose).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: "sdk",
        model: "opus",
        allowedTools: ["Bash"],
        permissionMode: "acceptEdits",
        systemPrompt: "Be concise",
      }),
    );
  });

  it("does not pass claude-only options to kimi compose", async () => {
    (mockKimiCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "kimi" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      provider: "kimi",
      backend: "sdk",
      model: "opus",
      allowedTools: ["Bash"],
    });
    await fn();

    const calledWith = (mockKimiCompose as any).mock.calls[0][0];
    expect(calledWith).not.toHaveProperty("backend");
    expect(calledWith).not.toHaveProperty("model");
    expect(calledWith).not.toHaveProperty("allowedTools");
  });

  it("forwards shared options to qwen compose", async () => {
    (mockQwenCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "qwen" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "orchestrate",
      tools: { t: dummyTool },
      provider: "qwen",
      composeMode: "code",
      timeoutMs: 30_000,
      maxIterations: 3,
    });
    await fn();

    expect(mockQwenCompose).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "orchestrate",
        composeMode: "code",
        timeoutMs: 30_000,
        maxIterations: 3,
      }),
    );
  });

  it("does not pass claude-only options to qwen compose", async () => {
    (mockQwenCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "qwen" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      provider: "qwen",
      backend: "sdk",
      model: "opus",
      allowedTools: ["Bash"],
    });
    await fn();

    const calledWith = (mockQwenCompose as any).mock.calls[0][0];
    expect(calledWith).not.toHaveProperty("backend");
    expect(calledWith).not.toHaveProperty("model");
    expect(calledWith).not.toHaveProperty("allowedTools");
  });

  it("forwards shared options to gemini compose", async () => {
    (mockGeminiCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "gemini" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "orchestrate",
      tools: { t: dummyTool },
      provider: "gemini",
      composeMode: "code",
      timeoutMs: 30_000,
      maxIterations: 3,
    });
    await fn();

    expect(mockGeminiCompose).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "orchestrate",
        composeMode: "code",
        timeoutMs: 30_000,
        maxIterations: 3,
      }),
    );
  });

  it("does not pass claude-only options to gemini compose", async () => {
    (mockGeminiCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "gemini" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      provider: "gemini",
      backend: "sdk",
      model: "opus",
      allowedTools: ["Bash"],
    });
    await fn();

    const calledWith = (mockGeminiCompose as any).mock.calls[0][0];
    expect(calledWith).not.toHaveProperty("backend");
    expect(calledWith).not.toHaveProperty("model");
    expect(calledWith).not.toHaveProperty("allowedTools");
  });

  it("passes tools through to the underlying compose", async () => {
    (mockClaudeCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    const tool1 = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "claude" as const,
      }),
      description: "first tool",
    };
    const tool2 = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "claude" as const,
      }),
      description: "second tool",
    };

    const fn = compose({
      prompt: "test",
      tools: { translate: tool1, summarize: tool2 },
    });
    await fn();

    const calledWith = (mockClaudeCompose as any).mock.calls[0][0];
    expect(Object.keys(calledWith.tools)).toEqual(["translate", "summarize"]);
    expect(calledWith.tools.translate.description).toBe("first tool");
    expect(calledWith.tools.summarize.description).toBe("second tool");
  });
});

// ─── Default Provider ───────────────────────────────────────

describe("compose — default provider", () => {
  it("uses global default provider", async () => {
    (mockKimiCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    setDefaultProvider("kimi");

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "kimi" as const,
      }),
      description: "test",
    };

    const fn = compose({ prompt: "test", tools: { t: dummyTool } });
    await fn();
    expect(mockKimiCompose).toHaveBeenCalledOnce();
    expect(mockClaudeCompose).not.toHaveBeenCalled();
  });

  it("explicit provider overrides default", async () => {
    (mockClaudeCompose as any).mockReturnValue(async () => ({
      data: "",
      raw: "",
      durationMs: 0,
    }));

    setDefaultProvider("kimi");

    const dummyTool = {
      fn: async () => ({
        data: "",
        raw: "",
        durationMs: 0,
        provider: "claude" as const,
      }),
      description: "test",
    };

    const fn = compose({
      prompt: "test",
      tools: { t: dummyTool },
      provider: "claude",
    });
    await fn();
    expect(mockClaudeCompose).toHaveBeenCalledOnce();
    expect(mockKimiCompose).not.toHaveBeenCalled();
  });
});
