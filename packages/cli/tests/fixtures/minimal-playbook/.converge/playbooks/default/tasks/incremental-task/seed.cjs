"use strict";

const fs = require("node:fs");
const path = require("node:path");

async function run(ctx) {
  const targetDir = path.join(ctx.projectDir, "target", "incremental-task");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "result.txt"), "done\n", "utf-8");

  // Sentinel: append invocation timestamp so tests can count invocations
  const sentinel = path.join(ctx.projectDir, "incremental-task", "invocation.log");
  const sentinelDir = path.dirname(sentinel);
  if (!fs.existsSync(sentinelDir)) {
    fs.mkdirSync(sentinelDir, { recursive: true });
  }
  fs.appendFileSync(sentinel, new Date().toISOString() + "\n", "utf-8");

  await ctx.spawn({
    id: "result-file",
    title: "Result file",
  });
}

module.exports = { run };
