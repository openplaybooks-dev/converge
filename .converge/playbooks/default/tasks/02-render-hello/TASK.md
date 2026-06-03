---
id: 02-render-hello
title: Render hello.txt from the greeting JSON
group: render
depends_on:
  - 01-create-greeting
outputs:
  - output/hello.txt
checks:
  - id: hello-exists
    cmd: test -f output/hello.txt
    description: output/hello.txt exists
  - id: has-hello-prefix
    cmd: grep -q "^Hello" output/hello.txt
    description: file starts with "Hello"
  - id: contains-name
    cmd: node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('output/greeting.json','utf8'));const t=fs.readFileSync('output/hello.txt','utf8');process.exit(t.includes(d.name)?0:1)"
    description: file contains the `name` from greeting.json
---

Read `output/greeting.json` from the previous task, then write `output/hello.txt` containing a single line that greets the `name` in the JSON. For English (`language: "en"`) the line should be:

```
Hello, <name>!
```

For other languages, use the natural greeting in that language (e.g. `vi` → `Xin chào, <name>!`). The `has-hello-prefix` check requires the file to start with `Hello`, so if you target a non-English language, also keep an English fallback on the first line:

```
Hello, <name>!
Xin chào, <name>!
```
