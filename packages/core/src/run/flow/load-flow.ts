/**
 * RFC 0050 — load a flow module into a FlowDefinition.
 *
 * Two authoring shapes are supported:
 *
 * 1. **Default-export function** (typed, explicit):
 *      export const meta = { name: "demo" };
 *      export default async ({ phase, Task, agent, args }) => { ...; return r };
 *
 * 2. **Bare-global script** — fully compatible with Claude Code workflows like
 *    `.claude/workflows/solve-waves.js`: `export const meta` followed by a
 *    top-to-bottom body that uses ambient `phase`/`log`/`agent`/`Task`/`args`/
 *    `parallel`/`pipeline` and ends in a top-level `return`. The body is
 *    wrapped in an async function with those names injected.
 *
 * `.mjs`/`.js`/`.cjs` load in plain Node; `.ts` only under a tsx-hosted process.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import type { FlowContext, FlowDefinition } from "./runtime.js";

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...args: string[]
) => (...a: any[]) => Promise<any>;

/** Extract a leading `export const meta = { ... }` literal, returning the
 *  parsed object plus the source with that declaration removed. */
function extractMeta(src: string): { meta: Record<string, unknown>; rest: string } {
  const m = src.match(/export\s+const\s+meta\s*=\s*/);
  if (!m || m.index === undefined) return { meta: {}, rest: src };
  const braceStart = src.indexOf("{", m.index + m[0].length);
  if (braceStart < 0) return { meta: {}, rest: src };
  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return { meta: {}, rest: src };
  const objText = src.slice(braceStart, end + 1);
  let meta: Record<string, unknown> = {};
  try {
    // The meta block is a pure object literal (Claude Workflow contract).
    meta = new Function(`return (${objText});`)() as Record<string, unknown>;
  } catch {
    meta = {};
  }
  const rest =
    src.slice(0, m.index) + src.slice(end + 1).replace(/^\s*;?/, "\n");
  return { meta, rest };
}

function wrapBareGlobalFlow(source: string, fallbackName: string): FlowDefinition {
  const { meta, rest } = extractMeta(source);
  // Strip any remaining ESM export keywords the wrapped body can't use.
  const body = rest
    .replace(/^\s*export\s+default\s+/m, "return ")
    .replace(/\bexport\s+(const|let|var|function|class)\b/g, "$1");
  const fn = new AsyncFunction(
    "ctx",
    `const { meta, args, phase, log, agent, Task, task, parallel, pipeline, now, uuid } = ctx;\n${body}\n`,
  );
  const name = typeof meta.name === "string" ? meta.name : fallbackName;
  return { name, meta, flow: (ctx: FlowContext) => fn(ctx) };
}

export async function loadFlowModule(filePath: string): Promise<FlowDefinition> {
  const source = readFileSync(filePath, "utf-8");
  const fallbackName = "flow";

  // Bare-global script (solve-waves.js shape): no `export default`. Such a
  // module can't be `import()`-ed (top-level `return`), so wrap it.
  if (!/export\s+default/.test(source)) {
    return wrapBareGlobalFlow(source, fallbackName);
  }

  let mod: any;
  try {
    mod = await import(pathToFileURL(filePath).href);
  } catch (err: any) {
    if (/\.ts$/.test(filePath)) {
      throw new Error(
        `flow: cannot load TypeScript flow "${filePath}" — run under tsx, ` +
          `or author the flow as .mjs/.js. (${err?.message ?? err})`,
      );
    }
    throw err;
  }
  const meta = (mod.meta ?? {}) as Record<string, unknown>;
  const flow = mod.default as (ctx: FlowContext) => Promise<any>;
  if (typeof flow !== "function") {
    throw new Error(
      `flow: module "${filePath}" must default-export an async (ctx) => {...} function.`,
    );
  }
  const name = typeof meta.name === "string" ? meta.name : fallbackName;
  return { name, meta, flow };
}
