#!/usr/bin/env tsx
/**
 * ACP (Agent SDK) and Kimi Provider Examples
 * 
 * This example demonstrates how to use both the scpfn package (ACP provider)
 * and the kimifn package (Kimi provider) via the agentfn unified interface.
 */

import { agentfn, setDefaultProvider, compose } from "@converge/agentfn";
import { z } from "zod";

// Set ACP as the default provider (can be overridden per-function)
setDefaultProvider("acp");

// Example 1: Simple function with schema validation
async function simpleExample() {
  console.log("=== Simple Example ===");

  const analyzeCode = agentfn({
    provider: "acp",  // Explicitly use ACP provider
    prompt: "Analyze this code for issues: {{input}}",
    logDir: "./.converge/logs",
    schema: z.object({
      issues: z.array(z.object({
        severity: z.enum(["low", "medium", "high", "critical"]),
        description: z.string(),
      })),
      summary: z.string(),
    }),
  });

  const code = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}
`;

  const result = await analyzeCode(code);
  console.log("Provider:", result.provider);  // "acp"
  console.log("Data:", result.data);
  console.log("Duration:", result.durationMs, "ms");
  console.log("Session ID:", result.sessionId);
  console.log("Log Path:", result.logPath);
}

// Example 2: With hooks for streaming
async function streamingExample() {
  console.log("\n=== Streaming Example ===");

  const generateDocs = agentfn({
    provider: "acp",
    prompt: "Generate JSDoc documentation for: {{input}}",
    logDir: "./.converge/logs",
    hooks: {
      before: ({ prompt }) => {
        console.log("Starting generation...");
        return prompt;
      },
      onStream: (chunk) => {
        process.stdout.write(chunk);
      },
      after: ({ result, durationMs }) => {
        console.log(`\n\nCompleted in ${durationMs}ms`);
      },
    },
  });

  const code = `function debounce(fn, delay) { let id; return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), delay); }; }`;
  
  const result = await generateDocs(code);
  console.log("\nResult:", result.data);
}

// Example 3: Composition with tools
async function composeExample() {
  console.log("\n=== Composition Example ===");

  // Define tools using scpfn
  const readFile = agentfn({
    provider: "acp",
    prompt: "Read and summarize the file: {{input}}",
    allowedTools: ["Read"],
    logDir: "./.converge/logs",
  });

  const findBugs = agentfn({
    provider: "acp",
    prompt: "Find bugs in this code: {{input}}",
    logDir: "./.converge/logs",
  });

  const suggestFixes = agentfn({
    provider: "acp",
    prompt: "Suggest fixes for these issues: {{input}}",
    logDir: "./.converge/logs",
  });

  // Compose them together
  const analyzeProject = compose({
    provider: "acp",
    prompt: "Analyze the codebase in {{input}} and provide a comprehensive report",
    composeMode: "code",
    tools: {
      readFile: {
        fn: readFile,
        description: "Read and summarize a file",
      },
      findBugs: {
        fn: findBugs,
        description: "Find bugs in code",
      },
      suggestFixes: {
        fn: suggestFixes,
        description: "Suggest fixes for issues",
      },
    },
    hooks: {
      onToolCall: ({ name, input }) => {
        console.log(`Tool called: ${name} with input: ${input.slice(0, 50)}...`);
      },
    },
  });

  const result = await analyzeProject("./src");
  console.log("Analysis result:", result.data);
}

// Example 4: With MCP servers
async function mcpExample() {
  console.log("\n=== MCP Server Example ===");

  const queryDatabase = agentfn({
    provider: "acp",
    prompt: "Query the database for: {{input}}",
    logDir: "./.converge/logs",
    // These options are passed through to the Agent SDK
    mcpServers: {
      postgres: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"],
      },
    },
  });

  const result = await queryDatabase("Get all users who signed up in the last 7 days");
  console.log("Query result:", result.data);
}

// Example 5: Using Kimi backend
async function kimiExample() {
  console.log("\n=== Kimi Backend Example ===");

  const kimiAssistant = agentfn({
    provider: "kimi",  // Use Kimi provider
    prompt: "{{input}}",
    logDir: "./.converge/logs",
    // Kimi-specific options
    timeoutMs: 120000,
    maxRetries: 2,
  });

  const result = await kimiAssistant("Explain TypeScript generics with examples");
  console.log("Provider:", result.provider);  // "kimi"
  console.log("Response:", result.data);
  console.log("Duration:", result.durationMs, "ms");
}

// Example 6: Session resumption (ACP only - for comparison)
async function sessionExample() {
  console.log("\n=== Session Example (ACP) ===");

  const assistant = agentfn({
    provider: "acp",
    prompt: "{{input}}",
    logDir: "./.converge/logs",
  });

  // First interaction
  const result1 = await assistant("What are the best practices for error handling in TypeScript?");
  console.log("First response:", result1.data);
  console.log("Session ID:", result1.sessionId);

  // Resume the session for follow-up
  const followUp = agentfn({
    provider: "acp",
    prompt: "{{input}}",
    logDir: "./.converge/logs",
    resume: result1.sessionId,  // Continue the conversation
  });

  const result2 = await followUp("Can you show me an example using those patterns?");
  console.log("Follow-up response:", result2.data);
}

// Run examples
async function main() {
  try {
    // Uncomment the examples you want to run:
    
    // await simpleExample();      // ACP with schema validation
    // await streamingExample();   // ACP with streaming hooks
    // await composeExample();     // ACP with tool composition
    // await mcpExample();         // ACP with MCP servers
    // await kimiExample();        // Kimi backend example
    // await sessionExample();     // ACP session resumption

    console.log("Examples completed! Uncomment the ones you want to run.");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
