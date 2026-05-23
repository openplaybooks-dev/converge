#!/bin/bash
# validate-css-organization.sh
# Checks all design.css files for organization, responsiveness, and token compliance.
# Also confirms design.html imports shared CSS files.

set -euo pipefail

DESIGN_DIR=".design/screens"

python3 -c "
import glob, re, os

css_files = glob.glob('$DESIGN_DIR/**/design.css', recursive=True)
html_files = glob.glob('$DESIGN_DIR/**/design.html', recursive=True)
if not css_files:
    print('⚠️  No design.css files found (may be before 06-views runs)')
    exit(0)

errors = []
for css in css_files:
    content = open(css).read()

    # Must have responsive breakpoints
    if '@media' not in content:
        errors.append(f'{css}: missing responsive breakpoints')

    # Must have section comments for organization
    if '/*' not in content:
        errors.append(f'{css}: missing section comments')

    # No raw hex colors (must use tokens)
    no_comments = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    raw_colors = re.findall(r'(?<!var\()(?<!\')[#][0-9a-fA-F]{6}(?![-a-zA-Z0-9])', no_comments)
    if raw_colors:
        errors.append(f'{css}: raw hex colors found — use var(--...) tokens: {raw_colors[:3]}')

    # Should use tokens
    token_refs = re.findall(r'var\(--', content)
    if len(token_refs) < 3:
        errors.append(f'{css}: only {len(token_refs)} token references — should use design system tokens')

# Check HTML files import shared CSS
for html in html_files:
    h_content = open(html).read()
    if 'base.css' not in h_content:
        errors.append(f'{os.path.dirname(html)}/design.html: does not import base.css')
    if 'components.css' not in h_content:
        errors.append(f'{os.path.dirname(html)}/design.html: does not import components.css')

if errors:
    for e in errors:
        print(f'❌ {e}')
    exit(1)

print(f'✅ CSS organization: all {len(css_files)} files pass validation')
exit(0)
"
