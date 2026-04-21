---
id: 001-logline
title: Write Logline
description: Distill idea.md into a one-sentence logline.
inputs:
  - idea.md
outputs:
  - logline.md
checks:
  - id: logline-exists
    cmd: test -s logline.md
    description: Logline file written and non-empty
  - id: logline-one-sentence
    cmd: node -e "const L=require('fs').readFileSync('logline.md','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#')).length;if(L>2){process.exit(1)}"
    description: Logline body is ~1 sentence (≤2 non-header lines)
---

# Write Logline

Read `idea.md` and write a one-sentence logline to `logline.md`.

## Form

```
[Protagonist] + [inciting incident] + [goal] + [stakes/obstacle].
```

## Constraints

- Single sentence. No more than 35 words.
- Concrete nouns, active verbs.
- Name what's at stake if the protagonist fails.
- No genre labels ("a thriller about…") — show, don't tell.
- Write the logline **and nothing else**. No preamble, no explanation.

## Output shape

```markdown
# Logline

<your one sentence here>
```
