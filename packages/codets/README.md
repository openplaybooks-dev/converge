# @converge/codets

> Fluent, indentation-aware source code emitter — structured builders for generating TypeScript/JSX files

**codets** is a layered, extensible code generation library that lets you programmatically emit clean, properly-indented TypeScript, JSX, and React code. Perfect for scaffolding tools, AI code generators, AST transformers, and build tooling.

```typescript
import { TypeScriptBuilder } from "@converge/codets";

const code = new TypeScriptBuilder()
  .import("React", "react")
  .blank()
  .fn(
    "greet",
    "name: string",
    (b) => {
      b.line("console.log(`Hello, ${name}!`);");
    },
    { exported: true },
  )
  .toString();
```

**Output:**

```typescript
import React from "react";

export function greet(name: string) {
  console.log(`Hello, ${name}!`);
}
```

## Why codets?

| Problem                         | Solution                                               |
| ------------------------------- | ------------------------------------------------------ |
| **Manual string concatenation** | Fluent builder API with automatic indentation          |
| **Indentation hell**            | `.indent()` / `.dedent()` handle nesting automatically |
| **Import management**           | `ImportRegistry` tracks and deduplicates imports       |
| **Type-unsafe code generation** | TypeScript-first API with full type safety             |
| **Complex AST libraries**       | Simple, readable builders without AST overhead         |
| **Mixed concerns**              | Layered architecture — extend only what you need       |

## Quick Start

```bash
npm install @converge/codets
```

```typescript
import { ReactBuilder } from "@converge/codets";

const component = new ReactBuilder()
  .useClient()
  .import("{ useState }", "react")
  .blank()
  .fn(
    "Counter",
    "",
    (b) => {
      b.line("const [count, setCount] = useState(0);")
        .blank()
        .returnJsx((jsx) => {
          jsx
            .line("<button onClick={() => setCount(count + 1)}>")
            .indent()
            .line("Count: {count}")
            .dedent()
            .line("</button>");
        });
    },
    { exported: true },
  )
  .toString();

console.log(component);
```

**Output:**

```tsx
"use client";
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

## Architecture

**codets** uses a layered inheritance chain. Extend at any level:

```
CoreBuilder          → Language-agnostic text emission
  └─ ModuleBuilder   → ES imports, directives, banner
       └─ TypeScriptBuilder → fn, arrow, iface, const patterns
            └─ ReactBuilder → useClient, useServer, returnJsx
```

Each layer adds specialized methods while inheriting all parent capabilities.

## Core API

### CoreBuilder (Base Layer)

Language-agnostic text emission with indentation tracking.

```typescript
import { CoreBuilder } from "@converge/codets";

const code = new CoreBuilder()
  .line("if (condition) {")
  .indent()
  .line("doSomething();")
  .dedent()
  .line("}")
  .toString();
```

**Methods:**

- `.line(text)` — Emit a line at current indentation
- `.blank()` — Emit a blank line
- `.indent()` / `.dedent()` — Adjust indentation level
- `.block(opener, closer, body)` — Auto-indented block
- `.comment(text)` — Single-line comment
- `.docComment(lines)` — JSDoc block comment
- `.snippet(code)` — Embed pre-formatted code
- `.toString()` — Get final output

### ModuleBuilder

ES module imports and directives.

```typescript
import { ModuleBuilder } from "@converge/codets";

const code = new ModuleBuilder()
  .directive("'use strict';")
  .import("fs", "node:fs")
  .import("{ join }", "node:path")
  .blank()
  .line('const file = fs.readFileSync(join(__dirname, "data.txt"));')
  .toString();
```

**Methods:**

- `.import(what, from)` — Add ES import
- `.importDefault(name, from)` — Default import
- `.importStar(name, from)` — Namespace import
- `.directive(text)` — Add directive (e.g., `'use client'`)
- `.banner(text)` — Add file header comment

### TypeScriptBuilder

TypeScript declarations and patterns.

```typescript
import { TypeScriptBuilder } from "@converge/codets";

const code = new TypeScriptBuilder()
  .iface("User", (b) => {
    b.line("id: string;").line("name: string;").line("email: string;");
  })
  .blank()
  .fn(
    "createUser",
    "data: Partial<User>",
    (b) => {
      b.line("return { ...data, id: crypto.randomUUID() };");
    },
    { exported: true, returnType: "User" },
  )
  .toString();
```

**Methods:**

- `.fn(name, params, body, opts)` — Function declaration
- `.arrow(name, params, body, opts)` — Arrow function
- `.iface(name, body)` — Interface declaration
- `.typeAlias(name, value)` — Type alias
- `.enumDecl(name, body)` — Enum declaration
- `.constObject(name, body, opts)` — Const object literal
- `.constArray(name, body, opts)` — Const array literal

### ReactBuilder

React/JSX-specific helpers.

```typescript
import { ReactBuilder } from "@converge/codets";

const code = new ReactBuilder()
  .useClient()
  .import("React", "react")
  .blank()
  .fn(
    "App",
    "",
    (b) => {
      b.returnJsx((jsx) => {
        jsx
          .line('<div className="app">')
          .indent()
          .line("<h1>Hello World</h1>")
          .dedent()
          .line("</div>");
      });
    },
    { exported: true },
  )
  .toString();
```

**Methods:**

- `.useClient()` — Add `'use client'` directive
- `.useServer()` — Add `'use server'` directive
- `.returnJsx(body)` — JSX return block with parens

## Advanced Features

### Import Registry

Automatic import deduplication and organization.

```typescript
import { ImportRegistry } from "@converge/codets";

const imports = new ImportRegistry();
imports.add("useState", "react");
imports.add("useEffect", "react");
imports.add("fs", "node:fs");

console.log(imports.emit());
// import { useState, useEffect } from 'react';
// import fs from 'node:fs';
```

### ProjectBuilder

Manage multiple files in a virtual file tree.

```typescript
import { ProjectBuilder, TypeScriptBuilder } from "@converge/codets";

const project = new ProjectBuilder(TypeScriptBuilder);

project
  .file("src/index.ts", (b) => {
    b.import("{ greet }", "./greet.js").blank().line('greet("World");');
  })
  .file("src/greet.ts", (b) => {
    b.fn(
      "greet",
      "name: string",
      (body) => {
        body.line("console.log(`Hello, ${name}!`);");
      },
      { exported: true },
    );
  });

// Write all files to disk
await project.flush("/path/to/output");
```

### SemanticBuilder (v2)

AST-like semantic code generation (experimental).

```typescript
import { SemanticBuilder } from "@converge/codets";

const code = new SemanticBuilder()
  .import(["useState"], "react")
  .exportConst("Counter", "arrow", [], (b) => {
    b.const("count", "useState(0)");
    b.return("jsx", (jsx) => {
      jsx.raw("<button onClick={() => setCount(count + 1)}>");
      jsx.raw("  Count: {count}");
      jsx.raw("</button>");
    });
  })
  .toString();
```

## Examples

### Generate a TypeScript Config File

```typescript
import { TypeScriptBuilder } from "@converge/codets";

const tsconfig = new TypeScriptBuilder()
  .constObject(
    "config",
    (b) => {
      b.line("compilerOptions: {")
        .indent()
        .line('target: "ES2022",')
        .line('module: "NodeNext",')
        .line("strict: true,")
        .dedent()
        .line("},")
        .line('include: ["src/**/*"],');
    },
    { exported: true },
  )
  .toString();
```

### Create a Next.js API Route

```typescript
import { ReactBuilder } from "@converge/codets";

const route = new ReactBuilder()
  .import("{ NextRequest, NextResponse }", "next/server")
  .blank()
  .fn(
    "GET",
    "req: NextRequest",
    (b) => {
      b.line('const data = { message: "Hello from API" };').line(
        "return NextResponse.json(data);",
      );
    },
    { exported: true, async: true },
  )
  .toString();
```

### Generate a Test Suite

```typescript
import { TypeScriptBuilder } from "@converge/codets";

const test = new TypeScriptBuilder()
  .import("{ describe, it, expect }", "vitest")
  .import("{ greet }", "./greet.js")
  .blank()
  .line("describe('greet', () => {")
  .indent()
  .line("it('should greet by name', () => {")
  .indent()
  .line("expect(greet('World')).toBe('Hello, World!');")
  .dedent()
  .line("});")
  .dedent()
  .line("});")
  .toString();
```

### Scaffold a Component Library

```typescript
import { ProjectBuilder, ReactBuilder } from "@converge/codets";

const project = new ProjectBuilder(ReactBuilder);

const components = ["Button", "Input", "Card"];

components.forEach((name) => {
  project.file(`src/components/${name}.tsx`, (b) => {
    b.useClient()
      .import("React", "react")
      .blank()
      .iface(`${name}Props`, (props) => {
        props.line("children?: React.ReactNode;").line("className?: string;");
      })
      .blank()
      .fn(
        name,
        `props: ${name}Props`,
        (body) => {
          body.returnJsx((jsx) => {
            jsx.line(`<div className={props.className}>`);
            jsx.indent().line("{props.children}").dedent();
            jsx.line("</div>");
          });
        },
        { exported: true },
      );
  });
});

project.file("src/index.ts", (b) => {
  components.forEach((name) => {
    b.line(`export { ${name} } from './components/${name}.js';`);
  });
});

await project.flush("./output");
```

## API Reference

### CoreBuilder

| Method                     | Description         |
| -------------------------- | ------------------- |
| `line(text?)`              | Emit indented line  |
| `blank()`                  | Blank line          |
| `lines(texts)`             | Multiple lines      |
| `indent()`                 | Increase indent     |
| `dedent()`                 | Decrease indent     |
| `block(open, close, body)` | Auto-indented block |
| `comment(text)`            | `// comment`        |
| `docComment(lines)`        | JSDoc block         |
| `snippet(code)`            | Pre-formatted code  |
| `raw(text)`                | Unindented text     |
| `toString()`               | Final output        |

### ModuleBuilder

Extends `CoreBuilder`

| Method                      | Description         |
| --------------------------- | ------------------- |
| `import(what, from)`        | Named import        |
| `importDefault(name, from)` | Default import      |
| `importStar(name, from)`    | Namespace import    |
| `directive(text)`           | Top-level directive |
| `banner(text)`              | File header comment |

### TypeScriptBuilder

Extends `ModuleBuilder`

| Method                              | Description          |
| ----------------------------------- | -------------------- |
| `fn(name, params, body, opts?)`     | Function declaration |
| `arrow(name, params, body, opts?)`  | Arrow function       |
| `iface(name, body, exported?)`      | Interface            |
| `typeAlias(name, value, exported?)` | Type alias           |
| `enumDecl(name, body, exported?)`   | Enum                 |
| `constObject(name, body, opts?)`    | Const object         |
| `constArray(name, body, opts?)`     | Const array          |

### ReactBuilder

Extends `TypeScriptBuilder`

| Method            | Description              |
| ----------------- | ------------------------ |
| `useClient()`     | `'use client'` directive |
| `useServer()`     | `'use server'` directive |
| `returnJsx(body)` | JSX return block         |

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import { TypeScriptBuilder } from "@converge/codets";

const builder = new TypeScriptBuilder();
builder.fn("greet", "name: string", (b) => {
  // b is typed as TypeScriptBuilder
  b.line("console.log(name);");
});
```

## Use Cases

- **Scaffolding Tools** — Yeoman, Plop, Hygen generators
- **AI Code Generation** — LLM-powered code synthesis
- **Build Tools** — Code transformation and generation
- **Testing** — Generate test fixtures and mocks
- **Documentation** — Auto-generate code examples
- **AST Transformers** — High-level code emission from AST
- **CLI Tools** — Project scaffolding and boilerplate generation

## Design Principles

1. **Fluent API** — Method chaining for readable code generation
2. **Layered Architecture** — Extend only what you need
3. **Indentation-Aware** — Automatic, correct indentation
4. **TypeScript-First** — Full type safety and inference
5. **No Runtime Dependencies** — Zero deps, minimal footprint
6. **Extensible** — Subclass any builder for custom languages

## Comparison

| Feature            | codets    | Template Strings | AST Libraries |
| ------------------ | --------- | ---------------- | ------------- |
| **Indentation**    | Automatic | Manual           | Automatic     |
| **Type Safety**    | Full      | None             | Partial       |
| **Readability**    | High      | Medium           | Low           |
| **Complexity**     | Low       | Low              | High          |
| **Learning Curve** | Gentle    | None             | Steep         |
| **Dependencies**   | 0         | 0                | Many          |
| **Extensibility**  | High      | Low              | High          |

## Contributing

Contributions welcome! This package is part of the [Converge framework](https://github.com/useconverge/converge) monorepo.

## License

MIT

---

**Part of the [Converge](https://github.com/useconverge/converge) framework** — Reactive agentic project orchestration for AI-powered development.
