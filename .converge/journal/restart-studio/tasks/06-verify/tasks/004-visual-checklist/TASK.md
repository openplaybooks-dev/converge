---
id: 004-visual-checklist
title: Visual checklist — confirm rendered HTML has MC polish anchors
dependencies:
  - 003-dev-smoke
outputs:
  - .converge/studio-state/visual-checklist.json
checks:
  - id: visual-anchors-present
    description: All visual anchors are present
    cmd: "test -f .converge/studio-state/visual-checklist.json && node -e \"const r=JSON.parse(require('fs').readFileSync('.converge/studio-state/visual-checklist.json','utf8'));process.exit(r.allPassed===true?0:1)\""
---

Boot dev server again on port 4000, fetch `/playbooks` HTML, assert MC polish anchors:

1. `data-theme=` attribute present
2. A known playbook name (`implement-studio` or `restart-studio`)
3. Nav links: Playbooks, Runs, Settings
4. NOT contains MC strings (Mission Control, Launch Sequence, Fleet Status, Dispatch a Task, Dock an Agent)

```bash
lsof -ti :4000 | xargs -r kill -9
sleep 1
PORT=4000 CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge \
  pnpm --filter @converge/studio dev > /tmp/visual-check.log 2>&1 &
DEV_PID=$!
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/playbooks 2>/dev/null || echo 000)
  [ "$CODE" = "200" ] && break
  sleep 1
done

HTML=$(curl -s http://localhost:4000/playbooks)
A1=$(echo "$HTML" | grep -q 'data-theme=' && echo true || echo false)
A2=$(echo "$HTML" | grep -qE 'implement-studio|restart-studio|oss-standardize' && echo true || echo false)
A3=$(echo "$HTML" | grep -qi 'playbooks' && echo true || echo false)
A4=$(echo "$HTML" | grep -qi 'runs' && echo true || echo false)
A5=$(echo "$HTML" | grep -qi 'settings' && echo true || echo false)
A6=$(echo "$HTML" | grep -qE 'Mission Control|Launch Sequence|Fleet Status|Dispatch a Task|Dock an Agent' && echo false || echo true)

kill $DEV_PID 2>/dev/null
sleep 1
lsof -ti :4000 | xargs -r kill -9

ALL=true
for v in $A1 $A2 $A3 $A4 $A5 $A6; do [ "$v" = "true" ] || ALL=false; done

mkdir -p .converge/studio-state
node -e "
  const fs = require('fs');
  fs.writeFileSync('.converge/studio-state/visual-checklist.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    allPassed: $ALL,
    anchors: { dataTheme: $A1, knownPlaybookName: $A2, navPlaybooks: $A3, navRuns: $A4, navSettings: $A5, noMcText: $A6 }
  }, null, 2));
"
```
