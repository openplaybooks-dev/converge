# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **no-segment-after-catchall**
- ❌ **routes-respond-200**

## ❌ no-segment-after-catchall

**Command**: `bash -c 'bad=$(find packages/converge-studio/src/app -type d 2>/dev/null | awk -F/ "{ for (i=1;i<NF;i++) if (\$i ~ /^\\[\\.\\.\\./ && \$(i+1) !~ /^\\[/) { print; next } }"); test -z "$bad"'`
**Exit code**: 1
**Output**:
```
Command failed: bash -c 'bad=$(find packages/converge-studio/src/app -type d 2>/dev/null | awk -F/ "{ for (i=1;i<NF;i++) if (\$i ~ /^\\[\\.\\.\\./ && \$(i+1) !~ /^\\[/) { print; next } }"); test -z "$bad"'
```

## ❌ routes-respond-200

**Command**: `bash -c 'cd packages/converge-studio && (pnpm dev > /tmp/converge-studio-routes.log 2>&1 &); pid=$!; ok=0; for i in $(seq 1 30); do sleep 1; code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/ || echo 000); if [ "$code" = "200" ]; then ok=1; break; fi; done; if [ $ok -eq 0 ]; then kill $pid 2>/dev/null; cat /tmp/converge-studio-routes.log; exit 1; fi; for path in /playbooks/implement-studio /runs /api/playbooks; do code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000$path); if [ "$code" != "200" ]; then kill $pid 2>/dev/null; echo "FAIL $path -> $code"; exit 1; fi; done; sse=$(curl -s --max-time 2 -o /tmp/converge-sse.out -w "%{http_code}" http://localhost:4000/api/events || true); if [ "$sse" != "200" ] && [ "$sse" != "000" ]; then kill $pid 2>/dev/null; echo "FAIL /api/events -> $sse"; exit 1; fi; kill $pid 2>/dev/null; exit 0'`
**Exit code**: 1
**Output**:
```
> @converge/studio@0.1.0 dev /Users/minh/Documents/converge/packages/converge-studio
> next dev -p ${PORT:-4000}

   ▲ Next.js 15.5.15
   - Local:        http://localhost:4000
   - Network:      http://192.168.1.101:4000

 ✓ Starting...
[Error: Catch-all must be the last part of the URL.]
[?25h
```
