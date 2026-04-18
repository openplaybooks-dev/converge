import { claudefn } from "./src/index.js";
import { z } from "zod";

const TestSchema = z.object({
  greeting: z.string(),
  language: z.string(),
});

async function test() {
  console.log("Testing schema-based JSON output...\n");

  const fn = claudefn<z.infer<typeof TestSchema>>({
    prompt: "Say hello in French",
    schema: TestSchema,
    cwd: process.cwd(),
    logDir: "/tmp/claudefn-test",
    timeoutMs: 30000,
  });

  try {
    const result = await fn();
    console.log("✅ Success!");
    console.log("Data:", JSON.stringify(result.data, null, 2));
    console.log("\nRaw response preview:", result.raw.slice(0, 200));
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

test();
