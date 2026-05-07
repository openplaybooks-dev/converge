import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  compose,
  parseToolCalls,
  buildToolPreamble,
  buildCodePreamble,
  extractCode,
  executeCode,
} from "../src/index.js";
import { z } from "zod";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  const { EventEmitter } = require("node:events");
  const { Readable } = require("node:stream");

  let _queue: Array<{
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    delay?: number;
  }> = [];
  let _callIndex = 0;
  let _spawnCalls: any[][] = [];

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
    _spawnCalls.push(args);
    const resp = _queue[_callIndex] ?? _queue[_queue.length - 1] ?? {};
    _callIndex++;

    const stdout = resp.stdout ?? "";
    const stderr = resp.stderr ?? "";
    const exitCode = resp.exitCode ?? 0;
    const delay = resp.delay ?? 0;

    const proc = new EventEmitter();
    proc.stdout = makeReadable(stdout, delay);
    proc.stderr = makeReadable(stderr, delay);
    proc.stdin = { end: vi.fn() };
    proc.kill = vi.fn(() => {
      proc.emit("close", 1);
    });
    setTimeout(() => proc.emit("close", exitCode), delay + 5);
    return proc;
  });

  return {
    ...actual,
    spawn,
    __setQueue: (
      q: Array<{
        stdout?: string;
        stderr?: string;
        exitCode?: number;
        delay?: number;
      }>,
    ) => {
      _queue = q;
      _callIndex = 0;
      _spawnCalls = [];
    },
    __getSpawnCalls: () => _spawnCalls,
    __getCallCount: () => _callIndex,
  };
});

const mockCp = (await import("node:child_process")) as any;

beforeEach(() => {
  mockCp.__setQueue([{ stdout: "final answer" }]);
  vi.clearAllMocks();
});

// -- extractCode (unit) --

describe("extractCode", () => {
  it("extracts JS from ```js fence", () => {
    const text = 'Here is the code:\n```js\nreturn "hello";\n```';
    expect(extractCode(text)).toBe('return "hello";');
  });

  it("extracts from ```javascript fence", () => {
    const text = "```javascript\nconst x = 1;\nreturn x;\n```";
    expect(extractCode(text)).toBe("const x = 1;\nreturn x;");
  });

  it("extracts from ```ts fence", () => {
    const text = "```ts\nreturn 42;\n```";
    expect(extractCode(text)).toBe("return 42;");
  });

  it("returns null when no code fence found", () => {
    expect(extractCode("just plain text")).toBeNull();
  });

  it("returns null for non-JS code fences", () => {
    expect(extractCode('```python\nprint("hi")\n```')).toBeNull();
  });
});

// -- executeCode (unit) --

describe("executeCode", () => {
  it("executes code with no tools", async () => {
    const result = await executeCode("return 1 + 2;", {});
    expect(result).toBe(3);
  });

  it("executes code that calls injected tool functions", async () => {
    const greet = vi.fn(async (input?: string) => ({
      data: `Hello, ${input}!`,
      raw: `Hello, ${input}!`,
      durationMs: 1,
    }));

    const result = await executeCode(
      'const r = await greet("World");\nreturn r.data;',
      { greet },
    );
    expect(result).toBe("Hello, World!");
    expect(greet).toHaveBeenCalledWith("World");
  });

  it("executes code with multiple tools", async () => {
    const add = vi.fn(async (input?: string) => ({
      data: String(Number(input) + 10),
      raw: "",
      durationMs: 0,
    }));
    const upper = vi.fn(async (input?: string) => ({
      data: (input ?? "").toUpperCase(),
      raw: "",
      durationMs: 0,
    }));

    const result = await executeCode(
      `const { data: sum } = await add("5");
       const { data: text } = await upper("hello");
       return { sum, text };`,
      { add, upper },
    );
    expect(result).toEqual({ sum: "15", text: "HELLO" });
  });
});

// -- parseToolCalls (unit) --

describe("parseToolCalls", () => {
  it("parses a single tool_call block", () => {
    const text =
      'I\'ll translate that.\n<tool_call>\n{"name": "translate", "input": "hello"}\n</tool_call>';
    const calls = parseToolCalls(text);
    expect(calls).toEqual([{ name: "translate", input: "hello" }]);
  });

  it("parses multiple tool_call blocks", () => {
    const text = [
      '<tool_call>{"name": "a", "input": "x"}</tool_call>',
      "some text",
      '<tool_call>{"name": "b", "input": "y"}</tool_call>',
    ].join("\n");
    const calls = parseToolCalls(text);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ name: "a", input: "x" });
    expect(calls[1]).toEqual({ name: "b", input: "y" });
  });
});

// -- buildToolPreamble (unit) --

describe("buildToolPreamble", () => {
  it("lists all tools with descriptions", () => {
    const p = buildToolPreamble({
      translate: { description: "Translate text" },
      summarize: { description: "Summarize text" },
    });
    expect(p).toContain("- translate: Translate text");
    expect(p).toContain("- summarize: Summarize text");
  });
});

// -- buildCodePreamble (unit) --

describe("buildCodePreamble", () => {
  it("lists tool function signatures", () => {
    const p = buildCodePreamble({
      translate: { description: "Translate text" },
    });
    expect(p).toContain("translate(input?: string)");
    expect(p).toContain("Translate text");
  });
});

// -- compose — code mode (default) --

describe("compose — code mode (default)", () => {
  it("returns a callable function", () => {
    const fn = compose({ prompt: "test", tools: {} });
    expect(typeof fn).toBe("function");
  });

  it("spawns codex exec with correct flags", async () => {
    mockCp.__setQueue([{ stdout: '```js\nreturn "ok";\n```' }]);
    const fn = compose({ prompt: "Do something", tools: {} });
    await fn();
    const [cmd, args] = mockCp.__getSpawnCalls()[0];
    expect(cmd).toBe("codex");
    expect(args[0]).toBe("exec");
    expect(args).toContain("--sandbox");
    expect(args).toContain("danger-full-access");
    expect(args).toContain("--skip-git-repo-check");
    expect(args).toContain("--ephemeral");
  });

  it("prompt is the last positional argument", async () => {
    mockCp.__setQueue([{ stdout: '```js\nreturn "ok";\n```' }]);
    const fn = compose({
      prompt: "Do something",
      tools: {
        myTool: {
          fn: async () => ({ data: "", raw: "", durationMs: 0 }),
          description: "Does something",
        },
      },
    });
    await fn();
    const [, args] = mockCp.__getSpawnCalls()[0];
    // Prompt is positional — the last arg
    const prompt = args[args.length - 1];
    expect(prompt).toContain("myTool(input?: string)");
    expect(prompt).toContain("Do something");
  });

  it("executes code returned by Codex and returns the result", async () => {
    mockCp.__setQueue([
      {
        stdout:
          'Here is the code:\n```js\nconst { data } = await translate("hello");\nreturn data;\n```',
      },
    ]);

    const translateFn = vi.fn(async (input?: string) => ({
      data: `translated: ${input}`,
      raw: `translated: ${input}`,
      durationMs: 5,
    }));

    const fn = compose({
      prompt: "Translate hello",
      tools: {
        translate: { fn: translateFn, description: "Translate text" },
      },
    });

    const result = await fn();
    expect(translateFn).toHaveBeenCalledWith("hello");
    expect(result.data).toBe("translated: hello");
    expect(result.raw).toContain("```js");
    expect(mockCp.__getCallCount()).toBe(1);
  });

  it("treats response without code fence as prose answer", async () => {
    mockCp.__setQueue([{ stdout: "Just a plain text answer" }]);
    const fn = compose({ prompt: "test", tools: {} });
    const result = await fn();
    expect(result.data).toBe("Just a plain text answer");
  });

  it("interpolates {{input}} in prompt", async () => {
    mockCp.__setQueue([{ stdout: '```js\nreturn "ok";\n```' }]);
    const fn = compose({
      prompt: "Process {{input}}",
      tools: {},
    });
    await fn("my data");
    const [, args] = mockCp.__getSpawnCalls()[0];
    const prompt = args[args.length - 1];
    expect(prompt).toContain("Process my data");
  });

  it("retries with error context when code execution fails", async () => {
    mockCp.__setQueue([
      { stdout: '```js\nthrow new Error("oops");\n```' },
      { stdout: '```js\nreturn "fixed";\n```' },
    ]);

    const fn = compose({
      prompt: "test",
      tools: {},
      maxIterations: 3,
    });

    const result = await fn();
    expect(result.data).toBe("fixed");
    expect(mockCp.__getCallCount()).toBe(2);

    const secondPrompt =
      mockCp.__getSpawnCalls()[1][1][
        mockCp.__getSpawnCalls()[1][1].length - 1
      ];
    expect(secondPrompt).toContain("oops");
  });

  it("throws after exhausting maxIterations", async () => {
    mockCp.__setQueue([
      { stdout: '```js\nthrow new Error("always fails");\n```' },
    ]);

    const fn = compose({
      prompt: "test",
      tools: {},
      maxIterations: 2,
    });

    await expect(fn()).rejects.toThrow(/code execution failed/);
    expect(mockCp.__getCallCount()).toBe(2);
  });

  it("validates code result against zod schema", async () => {
    mockCp.__setQueue([
      {
        stdout: '```js\nreturn { name: "Alice", age: 30 };\n```',
      },
    ]);

    const fn = compose({
      prompt: "test",
      tools: {},
      schema: z.object({ name: z.string(), age: z.number() }),
    });

    const result = await fn();
    expect(result.data).toEqual({ name: "Alice", age: 30 });
  });
});

// -- compose — tool_call mode --

describe("compose — tool_call mode", () => {
  it("returns directly when response has no tool_call blocks", async () => {
    mockCp.__setQueue([{ stdout: "The answer is 42" }]);
    const fn = compose({
      prompt: "Question",
      tools: {
        search: {
          fn: async () => ({ data: "", raw: "", durationMs: 0 }),
          description: "Search",
        },
      },
      composeMode: "tool_call",
    });
    const result = await fn();
    expect(result.data).toBe("The answer is 42");
  });

  it("executes tool call and returns final answer", async () => {
    const toolFn = vi.fn(async (input?: string) => ({
      data: `translated: ${input}`,
      raw: `translated: ${input}`,
      durationMs: 10,
    }));

    mockCp.__setQueue([
      {
        stdout:
          '<tool_call>\n{"name": "translate", "input": "hello"}\n</tool_call>',
      },
      { stdout: 'The translation is "bonjour"' },
    ]);

    const fn = compose({
      prompt: "Translate hello",
      tools: {
        translate: { fn: toolFn, description: "Translate" },
      },
      composeMode: "tool_call",
    });

    const result = await fn();
    expect(toolFn).toHaveBeenCalledWith("hello");
    expect(result.data).toBe('The translation is "bonjour"');
  });
});

// -- compose — hooks --

describe("compose — hooks", () => {
  it("before hook modifies prompt in code mode", async () => {
    mockCp.__setQueue([{ stdout: '```js\nreturn "ok";\n```' }]);
    const fn = compose({
      prompt: "original",
      tools: {},
      hooks: {
        before: ({ prompt }) => `MODIFIED: ${prompt}`,
      },
    });
    await fn();
    const [, args] = mockCp.__getSpawnCalls()[0];
    const prompt = args[args.length - 1];
    expect(prompt).toContain("MODIFIED: original");
  });

  it("after hook receives result and duration", async () => {
    mockCp.__setQueue([{ stdout: '```js\nreturn "done";\n```' }]);
    const afterSpy = vi.fn();
    const fn = compose({
      prompt: "test",
      tools: {},
      hooks: { after: afterSpy },
    });
    await fn();
    expect(afterSpy).toHaveBeenCalledOnce();
    expect(afterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.any(String),
        durationMs: expect.any(Number),
      }),
    );
  });
});

// -- compose — error handling --

describe("compose — error handling", () => {
  it("throws on CLI non-zero exit code", async () => {
    mockCp.__setQueue([{ stderr: "CLI error", exitCode: 1 }]);
    const fn = compose({ prompt: "test", tools: {} });
    await expect(fn()).rejects.toThrow("CLI error");
  });

  it("throws on timeout", async () => {
    mockCp.__setQueue([{ stdout: "", delay: 5000 }]);
    const fn = compose({ prompt: "test", tools: {}, timeoutMs: 50 });
    await expect(fn()).rejects.toThrow(/timed out/i);
  });

  it("retries the whole compose on maxRetries", async () => {
    let callCount = 0;
    mockCp.spawn.mockImplementation((...args: any[]) => {
      const { EventEmitter } = require("node:events");
      const { Readable } = require("node:stream");
      callCount++;
      const succeed = callCount >= 2;
      const proc = new EventEmitter();
      const stdout = new Readable({ read() {} });
      const stderr = new Readable({ read() {} });
      if (succeed) {
        setTimeout(() => {
          stdout.push('```js\nreturn "ok";\n```');
          stdout.push(null);
        }, 0);
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

    const fn = compose({ prompt: "test", tools: {}, maxRetries: 2 });
    const result = await fn();
    expect(result.data).toBe("ok");
  });
});
