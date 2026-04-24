# Checks: 01-prepare-requirements/006-enrich-screens-html-reference

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## screens-json-valid
**Description**: screens.json is valid JSON
**Command**: `python3 -c "import json; json.load(open('.stitch/screens.json'))"`

## screens-json-html-reference-field
**Description**: Every screen entry has string htmlReference
**Command**: `python3 -c "import json,sys; d=json.load(open('.stitch/screens.json')); sys.exit(0 if isinstance(d,list) and all(isinstance(x,dict) and 'htmlReference' in x and isinstance(x.get('htmlReference'),str) for x in d) else 1)"`