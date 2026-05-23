#!/bin/bash
# validate-html-structure.sh
# Checks all design.html files for semantic HTML5, accessibility attributes,
# and proper CSS imports (base.css + components.css).

set -euo pipefail

DESIGN_DIR=".design/screens"

python3 -c "
import glob, re, os

html_files = glob.glob('$DESIGN_DIR/**/design.html', recursive=True)
if not html_files:
    print('⚠️  No design.html files found (may be before 06-views runs)')
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

    # Semantic elements
    semantic = ['<header', '<main', '<footer']
    for tag in semantic:
        if tag not in content:
            errors.append(f'{html}: missing semantic element {tag}')

    # ARIA attributes
    aria = re.findall(r'aria-label', content) + re.findall(r'role=', content)
    if not aria:
        errors.append(f'{html}: no ARIA attributes found')

    # Shared CSS imports
    if 'base.css' not in content:
        errors.append(f'{html}: does not import base.css')
    if 'components.css' not in content:
        errors.append(f'{html}: does not import components.css')
    if 'tokens.css' not in content:
        errors.append(f'{html}: does not import tokens.css')

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
