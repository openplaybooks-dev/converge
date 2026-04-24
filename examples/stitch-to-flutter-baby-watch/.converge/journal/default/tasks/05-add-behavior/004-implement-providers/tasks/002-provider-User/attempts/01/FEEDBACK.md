# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ✅ **file-exists**
- ❌ **dart-valid**

## ❌ dart-valid

**Command**: `dart analyze lib/providers/user_provider.dart`
**Exit code**: 3
**Output**:
```
Analyzing user_provider.dart...

  error - user_provider.dart:5:6 - Target of URI hasn't been generated: 'package:folio/providers/user_provider.g.dart'. Try running the generator that will generate the file referenced by the URI. - uri_has_not_been_generated
  error - user_provider.dart:8:11 - Undefined class 'UserRef'. Try changing the name to the name of an existing class, or creating a class with the name 'UserRef'. - undefined_class

2 issues found.
```
