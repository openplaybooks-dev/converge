# Task: 06-verify/002-final-build

```bash
LOG=/tmp/studio-final-build.log
pnpm --filter @converge/studio build > "$LOG" 2>&1
EXIT=$?
mkdir -p .converge/studio-state
node -e "
  const fs = require('fs');
  fs.writeFileSync('.converge/studio-state/final-build.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    exitCode: $EXIT,
    logTail: fs.readFileSync('$LOG','utf8').split('\\n').slice(-50).join('\\n')
  }, null, 2));
  process.exit($EXIT);
"
```

Common failures (from prior session): catch-all sibling, missing 'use client', server/client hook mismatch. The log tail in the report shows what.