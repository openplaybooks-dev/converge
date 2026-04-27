# Attempt 2 Failed

**5** of **5** checks did not pass.

## What Failed

### brand-json-exists
Command: `test -f apps/landing/.content/brand.json`
Exit code: 1

### brand-json-valid
Command: `test -f apps/landing/.content/brand.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/brand.json','utf8'))"`
Exit code: 1

### has-palette
Command: `test -f apps/landing/.content/brand.json && node -e "const b=require('./apps/landing/.content/brand.json');const ok=b.palette&&Object.keys(b.palette).length>=4;process.exit(ok?0:1)"`
Exit code: 1

### has-tagline
Command: `test -f apps/landing/.content/brand.json && node -e "const b=require('./apps/landing/.content/brand.json');process.exit(b.tagline==='Define done. Converge gets there.'?0:1)"`
Exit code: 1

### has-voice
Command: `test -f apps/landing/.content/brand.json && node -e "const b=require('./apps/landing/.content/brand.json');const ok=b.voice&&Array.isArray(b.voice.tone)&&b.voice.tone.length>=3;process.exit(ok?0:1)"`
Exit code: 1
