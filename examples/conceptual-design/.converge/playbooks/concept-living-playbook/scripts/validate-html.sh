#!/bin/bash
set -euo pipefail

HTML_FILE="${1:?Usage: validate-html.sh <path-to-html>}"

python3 -c "
import re, sys

html = open(sys.argv[1]).read()
errors = []

required = [
    ('<!doctype html', 'DOCTYPE declaration'),
    ('<html', 'html tag'),
    ('<head>', 'head section'),
    ('<style>', 'embedded style block'),
    ('<script>', 'embedded script block'),
    ('<body', 'body tag'),
]
for tag, name in required:
    if tag.lower() not in html.lower():
        errors.append(f'missing {name}')

# Must have task content
if not re.search(r'task|ingest|cluster|script|validate', html, re.IGNORECASE):
    errors.append('no task content found')

# Anti-patterns
anti_patterns = [
    (r'font-family[^;]*\binter\b[^;]*;', 'Inter font (banned)'),
    (r'lorem ipsum', 'Lorem ipsum placeholder text'),
]
for pattern, name in anti_patterns:
    if re.search(pattern, html, re.IGNORECASE):
        errors.append(f'anti-pattern: {name}')

# Size check
line_count = html.count('\n') + 1
if line_count < 200:
    errors.append(f'too short ({line_count} lines, minimum 200)')

if errors:
    for e in errors:
        print(f'FAIL: {e}', file=sys.stderr)
    sys.exit(1)
else:
    print(f'PASS: {len(required) + 2} checks passed ({line_count} lines)')
    sys.exit(0)
" "$HTML_FILE"
