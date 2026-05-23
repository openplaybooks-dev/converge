#!/bin/bash
# validate-token-consistency.sh
# Cross-checks all design.html and design.css against tokens.css.
# Flags raw hex values and undefined tokens.

set -euo pipefail

DESIGN_DIR=".design/screens"
TOKENS_CSS=".design/system/tokens.css"

if [ ! -f "$TOKENS_CSS" ]; then
  echo "❌ tokens.css not found at $TOKENS_CSS"
  exit 1
fi

python3 -c "
import re, glob, os

tokens_css = open('$TOKENS_CSS').read()
defined_tokens = set(re.findall(r'--([\w][\w-]*):', tokens_css))

errors = []
html_files = glob.glob('$DESIGN_DIR/**/design.html', recursive=True)
css_files = glob.glob('$DESIGN_DIR/**/design.css', recursive=True)

if not html_files:
    print('⚠️  No design.html files found (may be before 06-views runs)')
    exit(0)

for html in html_files:
    content = open(html).read()
    # Check no raw hex in the HTML body (not inside comments)
    # Strip HTML comments first
    no_comments = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
    raw_hex = re.findall(r'(?<!var\(--)(?<!\')[#][0-9a-fA-F]{6}(?![-a-zA-Z0-9])', no_comments)
    if raw_hex:
        errors.append(f'{html}: raw hex values found: {raw_hex[:3]}')

    # Check all var(--...) tokens are defined
    used = set(re.findall(r'var\(--([\w][\w-]*)', content))
    for t in used:
        if t not in defined_tokens:
            errors.append(f'{html}: undefined token --{t}')

for css in css_files:
    content = open(css).read()
    # Strip comments
    no_comments = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    raw_hex = re.findall(r'(?<!var\(--)(?<!\')[#][0-9a-fA-F]{6}(?![-a-zA-Z0-9])', no_comments)
    if raw_hex:
        errors.append(f'{css}: raw hex values found: {raw_hex[:3]}')

    used = set(re.findall(r'var\(--([\w][\w-]*)', content))
    for t in used:
        if t not in defined_tokens:
            errors.append(f'{css}: undefined token --{t}')

if errors:
    for e in errors:
        print(f'❌ {e}')
    exit(1)

print(f'✅ Token consistency: {len(html_files)} HTML + {len(css_files)} CSS files, all tokens valid')
exit(0)
"
