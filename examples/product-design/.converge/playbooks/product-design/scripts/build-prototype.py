#!/usr/bin/env python3
"""Build interactive prototype from design HTML files."""
import json, glob, os, sys

screens = []
for path in sorted(glob.glob(".design/screens/*/*/*/design.html")):
    parts = path.split("/")
    epic_id = parts[-3]
    feature_id = parts[-2]
    view_id = parts[-1].replace("/design.html", "")
    screens.append({"epicId": epic_id, "featureId": feature_id, "viewId": view_id, "path": path})

os.makedirs(".design/prototype/styles", exist_ok=True)

nav = []
for i, s in enumerate(screens):
    nav.append(f'{{"index": {i}, "title": "{s["viewId"]}", "path": "{s["path"]}"}}')

with open(".design/prototype/navigation.js", "w") as f:
    f.write(f"const SCREENS = [{','.join(nav)}];\n")
    f.write('let current = 0; function load(i) { current = i; document.getElementById("v").src = SCREENS[i].path; }')
    f.write('document.addEventListener("DOMContentLoaded", () => load(0));')

with open(".design/prototype/styles/prototype.css", "w") as f:
    f.write(".container { display: grid; grid-template-columns: 200px 1fr; height: 100vh; }")
    f.write("#sidebar { background: #f8f9fa; padding: 1rem; }")
    f.write(".btn { display: block; width: 100%; padding: 0.5rem; text-align: left; background: none; border: none; cursor: pointer; }")
    f.write(".btn.active { background: #dbeafe; }")
    f.write("#viewer { flex: 1; }")

with open(".design/prototype/index.html", "w") as f:
    f.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prototype</title>')
    f.write('<link rel="stylesheet" href="styles/prototype.css"></head>')
    f.write('<body><div class="container">')
    f.write('<nav id="sidebar"><h3>Screens</h3></nav>')
    f.write('<iframe id="viewer" src="about:blank"></iframe></div>')
    f.write('<script src="navigation.js"></script></body></html>')

if not screens:
    print("  (no screens found, created empty prototype)", file=sys.stderr)
print(f"Prototype: {len(screens)} screens")