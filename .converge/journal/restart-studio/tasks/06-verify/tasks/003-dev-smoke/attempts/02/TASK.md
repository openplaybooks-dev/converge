# Task: 06-verify/003-dev-smoke

Boot the dev server in background on port 4000, hit `/`, confirm 307→/playbooks→200.

**NEVER `pkill -f node`** — capture `$DEV_PID` and use `lsof -ti :4000 | xargs -r kill -9`.

```bash
lsof -ti :4000 2>/dev/null | xargs -r kill -9
sleep 1

PORT=4000 CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge \
  pnpm --filter @converge/studio dev -- --port 4000 > /tmp/dev-smoke.log 2>&1 &
DEV_PID=$!

for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/playbooks 2>/dev/null || echo 000)
  [ "$CODE" = "200" ] && break
  sleep 1
done

ROOT_FOLLOWED=$(curl -sL -o /dev/null -w '%{http_code}' http://localhost:4000/)
ROOT_FINAL_URL=$(curl -sL -o /dev/null -w '%{url_effective}' http://localhost:4000/)
PLAYBOOKS_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/playbooks)
INDEX_HTML=$(curl -s http://localhost:4000/playbooks | head -c 50000)
THEME_PRESENT=false
echo "$INDEX_HTML" | grep -q 'data-theme=' && THEME_PRESENT=true

kill $DEV_PID 2>/dev/null
sleep 1
lsof -ti :4000 2>/dev/null | xargs -r kill -9

mkdir -p .converge/studio-state
node -e "
  const fs = require('fs');
  fs.writeFileSync('.converge/studio-state/dev-smoke.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    rootFollowedHttpCode: $ROOT_FOLLOWED,
    rootFinalUrl: '$ROOT_FINAL_URL',
    rootRedirectsToPlaybooks: $ROOT_FOLLOWED === 200 && '$ROOT_FINAL_URL'.endsWith('/playbooks'),
    playbooksIndexHas200: $PLAYBOOKS_CODE === 200,
    themeAttributePresent: $THEME_PRESENT,
    logTail: fs.readFileSync('/tmp/dev-smoke.log','utf8').split('\\n').slice(-30).join('\\n')
  }, null, 2));
"
```