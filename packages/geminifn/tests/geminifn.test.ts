import { describe, it, expect, vi, beforeEach } from "vitest";
import { geminifn } from "../src/index.js";
import { z } from "zod";

// We mock child_process.spawn so no real CLI is invoked.
// The mock emits controlled stdout/stderr/exit events.
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal() as any;
  const { EventEmitter } = require("node:events");
  const { Readable } = require("node:stream");

  let _nextStdout = "Hello from Gemini";
  let _nextStderr = "";
  let _nextExitCode = 0;
  let _nextDelay = 0;
  let _spawnArgs: any[] = [];

  function makeReadable(data: string, delay: number): Readable {
    const r = new Readable({ read() {} });
    if (data) {
      setTimeout(() => {
        r.push(data);
        r.push(null);
      }, delay);
    } else {
      setTimeout(() => r.push(null), delay);
    }
    return r;
  }

  const spawn = vi.fn((...args: any[]) => {
    _spawnArgs = args;
    const proc = new EventEmitter();
    proc.stdout = makeReadable(_nextStdout, _nextDelay);
    proc.stderr = makeReadable(_nextStderr, _nextDelay);
    proc.stdin = { end: vi.fn() };
    proc.kill = vi.fn(() => {
      proc.emit("close", 1);
    });
    setTimeout(
      () => proc.emit("close", _nextExitCode),
      _nextDelay + 5
    );
    return proc;
  });

  return {
    ...actual,
    spawn,
    __setNext: (opts: {
      stdout?: string;
      stderr?: string;
      exitCode?: number;
      delay?: number;
    }) => {
      _nextStdout = opts.stdout ?? "Hello from Gemini";
      _nextStderr = opts.stderr ?? "";
      _nextExitCode = opts.exitCode ?? 0;
      _nextDelay = opts.delay ?? 0;
    },
    __getSpawnArgs: () => _spawnArgs,
  };
});

const mockCp = await import("node:child_process") as any;

beforeEach(() => {
  mockCp.__setNext({});
  vi.clearAllMocks();
});

// ─── Core API ───────────────────────────────────────────────

describe("geminifn — core API", () => {
  it("returns a callable function", () => {
    const fn = geminifn({ prompt: "Say hello" });
    expect(typeof fn).toBe("function");
  });

  it("invokes gemini CLI with -p flag", async () => {
    const fn = geminifn({ prompt: "Say hello" });
    await fn();
    const [cmd, args] = mockCp.__getSpawnArgs();
    expect(cmd).toBe("gemini");
    expect(args).toContain("-p");
  });

  it("returns result with data, raw, and durationMs", async () => {
    mockCp.__setNext({ stdout: "Hi there" });
    const fn = geminifn({ prompt: "Say hello" });
    const result = await fn();
    expect(result).toHaveProperty("data", "Hi there");
    expect(result).toHaveProperty("raw", "Hi there");
    expect(result).toHaveProperty("durationMs");
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("interpolates {{input}} in prompt template", async () => {
    const fn = geminifn({ prompt: "Translate {{input}} to French" });
    await fn("hello");
    const [, args] = mockCp.__getSpawnArgs();
    const pIdx = args.indexOf("-p");
    expect(args[pIdx + 1]).toBe("Translate hello to French");
  });

  it("works without {{input}} placeholder", async () => {
    const fn = geminifn({ prompt: "What is 2+2?" });
    await fn();
    const [, args] = mockCp.__getSpawnArgs();
    const pIdx = args.indexOf("-p");
    expect(args[pIdx + 1]).toBe("What is 2+2?");
  });

  it("passes extra cliFlags to the spawn args", async () => {
    const fn = geminifn({
      prompt: "test",
      cliFlags: ["--model", "gemini-2.5-pro"],
    });
    await fn();
    const [, args] = mockCp.__getSpawnArgs();
    expect(args).toContain("--model");
    expect(args).toContain("gemini-2.5-pro");
  });

  it("passes cwd to spawn options", async () => {
    const fn = geminifn({ prompt: "test", cwd: "/tmp/myproject" });
    await fn();
    const [, , opts] = mockCp.__getSpawnArgs();
    expect(opts.cwd).toBe("/tmp/myproject");
  });
});

// ─── Dynamic Prompt ─────────────────────────────────────────

describe("geminifn — dynamic prompt", () => {
  it("accepts a function that returns a prompt string", async () => {
    const fn = geminifn({ prompt: () => "dynamic hello" });
    await fn();
    const [, args] = mockCp.__getSpawnArgs();
    const pIdx = args.indexOf("-p");
    expect(args[pIdx + 1]).toBe("dynamic hello");
  });

  it("passes input to the prompt function", async () => {
    const fn = geminifn({
      prompt: (input) => `Translate ${input} to Spanish`,
    });
    await fn("goodbye");
    const [, args] = mockCp.__getSpawnArgs();
    const pIdx = args.indexOf("-p");
    expect(args[pIdx + 1]).toBe("Translate goodbye to Spanish");
  });

  it("prompt function receives undefined when no input given", async () => {
    const promptSpy = vi.fn(() => "no input prompt");
    const fn = geminifn({ prompt: promptSpy });
    await fn();
    expect(promptSpy).toHaveBeenCalledWith(undefined);
    const [, args] = mockCp.__getSpawnArgs();
    const pIdx = args.indexOf("-p");
    expect(args[pIdx + 1]).toBe("no input prompt");
  });

  it("dynamic prompt works with before hook", async () => {
    const fn = geminifn({
      prompt: (input) => `base: ${input}`,
      hooks: {
        before: ({ prompt }) => `HOOKED(${prompt})`,
      },
    });
    await fn("data");
    const [, args] = mockCp.__getSpawnArgs();
    const pIdx = args.indexOf("-p");
    expect(args[pIdx + 1]).toBe("HOOKED(base: data)");
  });

  it("dynamic prompt can use closures for context", async () => {
    let counter = 0;
    const fn = geminifn({
      prompt: () => `request #${++counter}`,
    });
    await fn();
    await fn();
    const [, args] = mockCp.__getSpawnArgs();
    const pIdx = args.indexOf("-p");
    expect(args[pIdx + 1]).toBe("request #2");
    expect(counter).toBe(2);
  });
});

// ─── Schema Validation ──────────────────────────────────────

describe("geminifn — schema validation", () => {
  it("parses JSON output through zod schema", async () => {
    mockCp.__setNext({
      stdout: JSON.stringify({ name: "Alice", age: 30 }),
    });
    const fn = geminifn({
      prompt: "Give me a person",
      schema: z.object({ name: z.string(), age: z.number() }),
    });
    const result = await fn();
    expect(result.data).toEqual({ name: "Alice", age: 30 });
  });

  it("throws on schema validation failure", async () => {
    mockCp.__setNext({ stdout: JSON.stringify({ name: 123 }) });
    const fn = geminifn({
      prompt: "Give me a person",
      schema: z.object({ name: z.string(), age: z.number() }),
    });
    await expect(fn()).rejects.toThrow();
  });

  it("extracts JSON from markdown code fences before parsing", async () => {
    mockCp.__setNext({
      stdout: '```json\n{"name":"Bob","age":25}\n```',
    });
    const fn = geminifn({
      prompt: "Give me a person",
      schema: z.object({ name: z.string(), age: z.number() }),
    });
    const result = await fn();
    expect(result.data).toEqual({ name: "Bob", age: 25 });
  });

  it("preserves raw output even when schema is used", async () => {
    const raw = JSON.stringify({ x: 1 });
    mockCp.__setNext({ stdout: raw });
    const fn = geminifn({
      prompt: "test",
      schema: z.object({ x: z.number() }),
    });
    const result = await fn();
    expect(result.raw).toBe(raw);
    expect(result.data).toEqual({ x: 1 });
  });
});

// ─── Hooks ──────────────────────────────────────────────────

describe("geminifn — hooks", () => {
  it("calls before hook and allows prompt modification", async () => {
    const fn = geminifn({
      prompt: "original prompt",
      hooks: {
        before: ({ prompt }) => `MODIFIED: ${prompt}`,
      },
    });
    await fn();
    const [, args] = mockCp.__getSpawnArgs();
    const pIdx = args.indexOf("-p");
    expect(args[pIdx + 1]).toBe("MODIFIED: original prompt");
  });

  it("calls after hook with result and duration", async () => {
    const afterSpy = vi.fn();
    mockCp.__setNext({ stdout: "some output" });
    const fn = geminifn({
      prompt: "test",
      hooks: { after: afterSpy },
    });
    await fn();
    expect(afterSpy).toHaveBeenCalledOnce();
    expect(afterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "some output",
        durationMs: expect.any(Number),
      })
    );
  });

  it("calls onStream hook with each stdout chunk", async () => {
    const chunks: string[] = [];
    mockCp.__setNext({ stdout: "streaming data" });
    const fn = geminifn({
      prompt: "test",
      hooks: { onStream: (chunk) => chunks.push(chunk) },
    });
    await fn();
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join("")).toBe("streaming data");
  });

  it("before hook returning void keeps original prompt", async () => {
    const fn = geminifn({
      prompt: "keep me",
      hooks: { before: () => {} },
    });
    await fn();
    const [, args] = mockCp.__getSpawnArgs();
    const pIdx = args.indexOf("-p");
    expect(args[pIdx + 1]).toBe("keep me");
  });
});

// ─── Error Handling ─────────────────────────────────────────

describe("geminifn — error handling", () => {
  it("throws on non-zero exit code with stderr", async () => {
    mockCp.__setNext({
      stdout: "",
      stderr: "Something went wrong",
      exitCode: 1,
    });
    const fn = geminifn({ prompt: "test" });
    await expect(fn()).rejects.toThrow("Something went wrong");
  });

  it("throws on non-zero exit code even without stderr", async () => {
    mockCp.__setNext({ stdout: "", stderr: "", exitCode: 1 });
    const fn = geminifn({ prompt: "test" });
    await expect(fn()).rejects.toThrow(/exit code 1/i);
  });

  it("times out and kills the process", async () => {
    mockCp.__setNext({ stdout: "", delay: 5000 });
    const fn = geminifn({ prompt: "test", timeoutMs: 50 });
    await expect(fn()).rejects.toThrow(/timed out/i);
  });

  it("retries on failure up to maxRetries", async () => {
    let callCount = 0;
    mockCp.spawn.mockImplementation((...args: any[]) => {
      const { EventEmitter } = require("node:events");
      const { Readable } = require("node:stream");
      callCount++;
      const proc = new EventEmitter();
      const succeed = callCount >= 3;
      const stdout = new Readable({ read() {} });
      const stderr = new Readable({ read() {} });
      if (succeed) {
        setTimeout(() => { stdout.push("success"); stdout.push(null); }, 0);
      } else {
        setTimeout(() => stdout.push(null), 0);
      }
      setTimeout(() => {
        stderr.push(succeed ? null : "fail");
        if (!succeed) stderr.push(null);
        else stderr.push(null);
      }, 0);
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.stdin = { end: vi.fn() };
      proc.kill = vi.fn();
      setTimeout(() => proc.emit("close", succeed ? 0 : 1), 5);
      return proc;
    });
    const fn = geminifn({ prompt: "test", maxRetries: 3 });
    const result = await fn();
    expect(result.data).toBe("success");
    expect(callCount).toBe(3);
  });

  it("throws after exhausting all retries", async () => {
    mockCp.spawn.mockRestore?.();
    mockCp.__setNext({ stdout: "", stderr: "permanent error", exitCode: 1 });
    const fn = geminifn({ prompt: "test", maxRetries: 2 });
    await expect(fn()).rejects.toThrow();
  });
});

// ─── Promptless usage ───────────────────────────────────────

describe("geminifn — promptless usage", () => {
  it("uses input as the full prompt when no prompt option is given", async () => {
    mockCp.__setNext({ stdout: "4" });
    const fn = geminifn();
    await fn("What is 2+2?");
    const [, args] = mockCp.__getSpawnArgs();
    const pIdx = args.indexOf("-p");
    expect(args[pIdx + 1]).toBe("What is 2+2?");
  });

  it("returns a callable function with no options", () => {
    const fn = geminifn();
    expect(typeof fn).toBe("function");
  });

  it("throws when no prompt option and no input argument", async () => {
    const fn = geminifn();
    await expect(fn()).rejects.toThrow(/prompt/i);
  });

  it("returns result data from promptless call", async () => {
    mockCp.__setNext({ stdout: "the answer" });
    const fn = geminifn();
    const result = await fn("Give me the answer");
    expect(result.data).toBe("the answer");
    expect(result.raw).toBe("the answer");
    expect(typeof result.durationMs).toBe("number");
  });
});
