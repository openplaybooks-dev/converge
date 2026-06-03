// Worker process: reads task args from env, calls appendTaskUpsert,
// exits. Used by runtime-ledger-concurrent.test.ts to exercise the
// cross-process lock — vitest's in-process test runner can't simulate
// cross-process file contention by itself.
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectDir = process.env.CONVERGE_TEST_PROJECT;
const playbook = process.env.CONVERGE_TEST_PLAYBOOK;
const taskId = process.env.CONVERGE_TEST_TASK_ID;

if (!projectDir || !playbook || !taskId) {
  console.error("worker: missing required env vars");
  process.exit(2);
}

// Import through the built bundle — a plain `node` child can't load .ts
// source (only Node >= 22.18 strips types natively; CI runs Node 20).
// The same appendTaskUpsert is re-exported from the dist index.
const distPath = resolve(__dirname, "../../dist/index.js");

try {
  const mod = await import(distPath);
  mod.appendTaskUpsert(projectDir, playbook, {
    id: taskId,
    goalId: "test-goal",
    summary: `worker task ${taskId}`,
  });
  process.exit(0);
} catch (err) {
  console.error("worker failed:", err?.stack || err?.message || err);
  process.exit(1);
}
