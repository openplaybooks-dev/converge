# Task: 06-verify/001-final-typecheck

```bash
pnpm --filter @converge/studio typecheck 2>&1 | tee /tmp/studio-final-typecheck.log
COUNT=$(grep -c 'error TS' /tmp/studio-final-typecheck.log || echo 0)
mkdir -p .converge/studio-state
node -e "
  const fs = require('fs');
  fs.writeFileSync('.converge/studio-state/final-typecheck.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    errorCount: $COUNT,
    logTail: fs.readFileSync('/tmp/studio-final-typecheck.log','utf8').split('\\n').slice(-30).join('\\n')
  }, null, 2));
  process.exit($COUNT === 0 ? 0 : 1);
"
```