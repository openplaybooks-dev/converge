# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ✅ **screens-json-valid**
- ❌ **screens-json-html-reference-field**

## ❌ screens-json-html-reference-field

**Command**: `python3 -c "import json,sys; d=json.load(open('.stitch/screens.json')); sys.exit(0 if isinstance(d,list) and all(isinstance(x,dict) and 'htmlReference' in x and isinstance(x.get('htmlReference'),str) for x in d) else 1)"`
**Exit code**: 1
**Output**:
```
Command failed: python3 -c "import json,sys; d=json.load(open('.stitch/screens.json')); sys.exit(0 if isinstance(d,list) and all(isinstance(x,dict) and 'htmlReference' in x and isinstance(x.get('htmlReference'),str) for x in d) else 1)"
```
