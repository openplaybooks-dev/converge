#!/bin/bash
# validate-html-structure.sh
# Checks all design.html files for semantic HTML5, accessibility attributes,
# and embedded CSS (self-contained, no external CSS links).

set -euo pipefail

DESIGN_DIR=".design/screens"

python3 -c "
import glob, re, os

html_files = glob.glob('$DESIGN_DIR/**/design.html', recursive=True)
if not html_files:
    print('⚠️  No design.html files found (may be before design-views runs)')
    exit(0)

errors = []
for html in html_files:
    content = open(html).read()

    # Required structural elements
    required_tags = [
        ('<!DOCTYPE html>', 'DOCTYPE declaration'),
        ('<html lang=', 'html lang attribute'),
        ('<head>', 'head section'),
        ('<meta charset', 'charset meta'),
        ('<meta name=\"viewport\"', 'viewport meta'),
        ('<body', 'body tag'),
    ]
    for tag, name in required_tags:
        if tag not in content:
            errors.append(f'{html}: missing {name}')

    # Must have embedded CSS
    if '<style>' not in content:
        errors.append(f'{html}: missing embedded <style> block')

    # Must NOT have external CSS links
    if '<link rel=\"stylesheet\"' in content:
        errors.append(f'{html}: has external CSS link — should be self-contained')

    # ARIA attributes (at least one)
    aria = re.findall(r'aria-label', content) + re.findall(r'role=', content)
    if not aria:
        errors.append(f'{html}: no ARIA attributes found')

    # Anti-patterns
    anti_patterns = ['lorem ipsum', 'john doe', 'jane doe', 'via.placeholder.com']
    for ap in anti_patterns:
        if re.search(ap, content, re.IGNORECASE):
            errors.append(f'{html}: contains anti-pattern \"{ap}\"')

if errors:
    for e in errors:
        print(f'❌ {e}')
    exit(1)

print(f'✅ HTML structure: all {len(html_files)} files pass validation')
exit(0)
"
