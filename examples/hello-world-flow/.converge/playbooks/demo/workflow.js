/**
 * RFC 0050 — LLM-free, hermetic durable-resume demo.
 *
 * Tasks are inline (self-contained, no AI provider needed) so this runs
 * anywhere and demonstrates resume-in-the-middle on disk:
 *
 *   converge run demo                       # fresh run
 *   FAIL_RENDER=1 converge run demo         # crash mid-flight after the greeting
 *   converge run demo --resume              # greeting replays, render continues
 *   converge run demo --resume              # everything cached, zero execution
 *
 * Each step prints "EXEC <id>" ONLY when it really runs — on replay it stays
 * silent because the result comes from .converge/journal/demo/steps.jsonl.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const meta = {
  name: "demo",
  description: "Greeting → render, inline tasks, resumable mid-flight.",
  phases: [{ title: "Greet" }, { title: "Render" }],
};

const OUT = join(process.cwd(), "output");

export default async function flow({ phase, log, task }) {
  mkdirSync(OUT, { recursive: true });

  phase("Greet");
  const greeting = await task(
    {
      id: "01-create-greeting",
      outputs: ["output/greeting.json"],
      run: ({ name = "world" }) => {
        console.error("EXEC 01-create-greeting"); // printed only on real execution
        const data = { name, language: "en" };
        writeFileSync(join(OUT, "greeting.json"), JSON.stringify(data, null, 2));
        return data;
      },
    },
    { name: "world" },
  );
  log(`greeting for ${greeting.name}`);

  phase("Render");
  const rendered = await task(
    {
      id: "02-render-hello",
      outputs: ["output/hello.txt"],
      run: ({ greeting }) => {
        console.error("EXEC 02-render-hello");
        if (process.env.FAIL_RENDER) throw new Error("render failed (injected)");
        const text = `Hello, ${greeting.name}!`;
        writeFileSync(join(OUT, "hello.txt"), text + "\n");
        return { text };
      },
    },
    { greeting },
  );

  return { done: true, message: rendered.text };
}
