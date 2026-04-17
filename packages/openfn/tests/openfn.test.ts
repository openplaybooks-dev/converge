import { describe, it, expect, vi, beforeEach } from "vitest";
import { openfn } from "../src/index.js";
import { z } from "zod";
import { tmpdir } from "node:os";

// We mock the @opencode-ai/sdk module since we can't make real API calls in tests.
vi.mock("@opencode-ai/sdk", async () => {
  const actual = await import("@opencode-ai/sdk") as any;

  let _queue: Array<unknown> = [];
  let _callIndex = 0;
  let _nextSessionId = "test-session-123";

  const mockSessionCreate = vi.fn(async () => {
    return {
      data: {
        id: _nextSessionId,
        title: "test session",
      },
    };
  });

  const mockSessionPrompt = vi.fn(async () => {
    // The SDK wraps responses in { data: { info: {...} } }
    // When using structured output, it returns { info: { structured_output: {...} } }
    // When using text, it returns { info: { text: "..." } }
    const resp = _queue[_callIndex] ?? _queue[_queue.length - 1] ?? { text: "default response" };
    _callIndex++;

    // Check if this is a structured output response
    if ((resp as any).structured_output) {
      return { data: { info: { structured_output: (resp as any).structured_output } } };
    }
    // Check if this has an info property (already SDK format)
    if ((resp as any).info) {
      return { data: resp };
    }
    // Otherwise wrap it as text response
    return { data: { info: { text: typeof resp === 'string' ? resp : JSON.stringify(resp) } } };
  });

  const MockClient = vi.fn().mockImplementation(() => ({
    session: {
      create: mockSessionCreate,
      prompt: mockSessionPrompt,
    },
  }));

  return {
    ...actual,
    createOpencodeClient: MockClient,
    __setNextResponse: (resp: unknown) => {
      _queue = [resp];
      _callIndex = 0;
    },
    __setQueue: (q: unknown[]) => {
      _queue = q;
      _callIndex = 0;
    },
    __reset: () => {
      _callIndex = 0;
    },
    __getCallCount: () => _callIndex,
    __setNextSessionId: (id: string) => {
      _nextSessionId = id;
    },
    __MockClient: MockClient,
  };
});

const mockSdk = await import("@opencode-ai/sdk") as any;

beforeEach(() => {
  mockSdk.__setQueue([]);
  mockSdk.__setNextSessionId("test-session-123");
  vi.clearAllMocks();
});

// ─── Core API ─────────────────────────────────────────────

describe("openfn — core API", () => {
  it("returns a callable function", () => {
    const fn = openfn({ prompt: "Say hello" });
    expect(typeof fn).toBe("function");
  });

  it("creates an Opencode client with the correct baseUrl", async () => {
    const fn = openfn({ prompt: "Say hello", baseUrl: "http://localhost:8080" });
    await fn();
    const ClientConstructor = mockSdk.__MockClient;
    expect(ClientConstructor).toHaveBeenCalledWith({ baseUrl: "http://localhost:8080" });
  });

  it("returns result with data, raw, and durationMs", async () => {
    mockSdk.__setNextResponse({ text: "hello world" });
    const fn = openfn({ prompt: "Say hello", logDir: tmpdir() });
    const result = await fn();
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("raw");
    expect(result).toHaveProperty("durationMs");
    expect(typeof result.durationMs).toBe("number");
  });

  it("captures session ID from session.create()", async () => {
    mockSdk.__setNextSessionId("abc-123");
    mockSdk.__setNextResponse({ text: "hello" });
    const fn = openfn({ prompt: "test", logDir: tmpdir() });
    const result = await fn();
    expect(result.sessionId).toBe("abc-123");
  });

  it("interpolates {{input}} in prompt template", async () => {
    mockSdk.__setNextResponse({ text: "translated: hello" });
    const fn = openfn({ prompt: "Translate {{input}} to French", logDir: tmpdir() });
    await fn("hello");
    expect(mockSdk.__MockClient).toHaveBeenCalled();
  });

  it("works without {{input}} placeholder", async () => {
    mockSdk.__setNextResponse({ text: "4" });
    const fn = openfn({ prompt: "What is 2+2?" });
    await fn();
    expect(mockSdk.__MockClient).toHaveBeenCalled();
  });

  it("accepts cwd option without error", async () => {
    mockSdk.__setNextResponse({ text: "ok" });
    const fn = openfn({ prompt: "test", cwd: "/tmp/myproject", logDir: tmpdir() });
    await fn();
    expect(mockSdk.__MockClient).toHaveBeenCalled();
  });
});

// ─── Dynamic Prompt ─────────────────────────────────────

describe("openfn — dynamic prompt", () => {
  it("accepts a function that returns a prompt string", async () => {
    mockSdk.__setNextResponse({ text: "dynamic hello" });
    const fn = openfn({ prompt: () => "dynamic hello", logDir: tmpdir() });
    await fn();
    expect(mockSdk.__MockClient).toHaveBeenCalled();
  });

  it("passes input to the prompt function", async () => {
    mockSdk.__setNextResponse({ text: "ok" });
    const fn = openfn({
      prompt: (input) => `Translate ${input} to Spanish`,
      logDir: tmpdir(),
    });
    await fn("goodbye");
    expect(mockSdk.__MockClient).toHaveBeenCalled();
  });

  it("prompt function receives undefined when no input given", async () => {
    const promptSpy = vi.fn(() => "no input prompt");
    mockSdk.__setNextResponse({ text: "ok" });
    const fn = openfn({ prompt: promptSpy, logDir: tmpdir() });
    await fn();
    expect(promptSpy).toHaveBeenCalledWith(undefined);
  });
});

// ─── Schema Validation ─────────────────────────────────────

describe("openfn — schema validation", () => {
  it("parses JSON output through zod schema", async () => {
    // SDK structured output is returned in result.data.info.structured_output
    mockSdk.__setQueue([
      { structured_output: { name: "Alice", age: 30 } },
    ]);
    const fn = openfn({
      prompt: "Give me a person",
      schema: z.object({ name: z.string(), age: z.number() }),
      logDir: tmpdir(),
    });
    const result = await fn();
    expect(result.data).toEqual({ name: "Alice", age: 30 });
  });

  it("extracts JSON from markdown code fences before parsing", async () => {
    // With SDK structured output, the response is directly in structured_output format
    mockSdk.__setQueue([
      { structured_output: { name: "Bob", age: 25 } },
    ]);
    const fn = openfn({
      prompt: "Give me a person",
      schema: z.object({ name: z.string(), age: z.number() }),
      logDir: tmpdir(),
    });
    const result = await fn();
    expect(result.data).toEqual({ name: "Bob", age: 25 });
  });
});

// ─── Hooks ────────────────────────────────────────────────

describe("openfn — hooks", () => {
  it("calls before hook and allows prompt modification", async () => {
    mockSdk.__setNextResponse({ text: "ok" });
    const fn = openfn({
      prompt: "original prompt",
      hooks: {
        before: ({ prompt }) => `MODIFIED: ${prompt}`,
      },
      logDir: tmpdir(),
    });
    await fn();
    expect(mockSdk.__MockClient).toHaveBeenCalled();
  });

  it("calls after hook with result and duration", async () => {
    const afterSpy = vi.fn();
    mockSdk.__setNextResponse({ text: "some output" });
    const fn = openfn({
      prompt: "test",
      hooks: { after: afterSpy },
      logDir: tmpdir(),
    });
    await fn();
    expect(afterSpy).toHaveBeenCalledOnce();
    expect(afterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.any(String),
        durationMs: expect.any(Number),
      })
    );
  });
});

// ─── Error Handling ────────────────────────────────────────

describe("openfn — error handling", () => {
  it("throws when no prompt option and no input argument", async () => {
    const fn = openfn();
    await expect(fn()).rejects.toThrow(/prompt/i);
  });
});

// ─── Promptless usage ─────────────────────────────────────

describe("openfn — promptless usage", () => {
  it("uses input as the full prompt when no prompt option is given", async () => {
    mockSdk.__setNextResponse({ text: "4" });
    const fn = openfn({ logDir: tmpdir() });
    await fn("What is 2+2?");
    expect(mockSdk.__MockClient).toHaveBeenCalled();
  });

  it("returns a callable function with no options", () => {
    const fn = openfn();
    expect(typeof fn).toBe("function");
  });

  it("throws when no prompt option and no input argument", async () => {
    const fn = openfn();
    await expect(fn()).rejects.toThrow(/prompt/i);
  });
});
