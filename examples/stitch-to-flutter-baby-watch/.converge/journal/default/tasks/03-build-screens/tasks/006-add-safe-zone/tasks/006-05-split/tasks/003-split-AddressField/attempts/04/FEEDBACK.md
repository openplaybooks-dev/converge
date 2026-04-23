# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **dart-valid**

## ❌ dart-valid

**Command**: `dart analyze lib/screens/add_safe_zone/widgets/address_field.dart`
**Exit code**: 4
**Output**:
```
An error occurred while executing an analyzer plugin: Failed to compile "/Users/hoangnguyen/.dartServer/.plugin_manager/9e820a09f9826aee5ce535ac929226a0/analyzer_plugin/bin/plugin.dart" to an AOT snapshot.
  pluginFolder = /Users/hoangnguyen/.dartServer/.plugin_manager/9e820a09f9826aee5ce535ac929226a0/analyzer_plugin
  exitCode = 254
  stdout = 
  stderr = ../../../../.pub-cache/hosted/pub.dev/analyzer_plugin-0.12.0/lib/src/utilities/change_builder/change_builder_dart.dart:2133:32: Error: The argument type 'Element' can't be assigned to the parameter type 'Element2'.
 - 'Element' is from 'package:analyzer/dart/element/element.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element.dart').
 - 'Element2' is from 'package:analyzer/dart/element/element2.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element2.dart').
            .publiclyExporting(element, resultCache: resultCache) ??
                               ^
../../../../.pub-cache/hosted/pub.dev/analyzer_plugin-0.12.0/lib/src/utilities/change_builder/change_builder_dart.dart:2133:54: Error: The argument type 'Map<Element, LibraryElement?>?' can't be assigned to the parameter type 'Map<Element2, LibraryElement2?>?'.
 - 'Map' is from 'dart:core'.
 - 'Element' is from 'package:analyzer/dart/element/element.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element.dart').
 - 'LibraryElement' is from 'package:analyzer/dart/element/element.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element.dart').
 - 'Element2' is from 'package:analyzer/dart/element/element2.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element2.dart').
 - 'LibraryElement2' is from 'package:analyzer/dart/element/element2.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element2.dart').
            .publiclyExporting(element, resultCache: resultCache) ??
                                                     ^
../../../../.pub-cache/hosted/pub.dev/analyzer_plugin-0.12.0/lib/src/utilities/change_builder/change_builder_dart.dart:2137:40: Error: The getter 'source' isn't defined for the type 'Object'.
 - 'Object' is from 'dart:core'.
Try correcting the name to the name of an existing getter, or defining a getter or field named 'source'.
    var uriToImport = libraryToImport?.source.uri;
                                       ^^^^^^
../../../../.pub-cache/hosted/pub.dev/analyzer_plugin-0.12.0/lib/src/utilities/change_builder/change_builder_dart.dart:2150:58: Error: The argument type 'Object?' can't be assigned to the parameter type 'LibraryElement?'.
 - 'Object' is from 'dart:core'.
 - 'LibraryElement' is from 'package:analyzer/dart/element/element.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/dart/element/element.dart').
      _removeUnnecessaryPendingElementImports(newImport, libraryToImport);
                                                         ^
../../../../.pub-cache/hosted/pub.dev/analyzer_plugin-0.12.0/lib/src/utilities/change_builder/change_builder_dart.dart:2182:14: Error: The method 'publiclyExporting2' isn't defined for the type 'TopLevelDeclarations'.
 - 'TopLevelDeclarations' is from 'package:analyzer/src/services/top_level_declarations.dart' ('../../../../.pub-cache/hosted/pub.dev/analyzer-7.6.0/lib/src/services/top_level_declarations.dart').
Try correcting the name to the name of an existing method, or defining a method named 'publiclyExporting2'.
            .publiclyExporting2(element, resultCache: resultCache) ??
             ^^^^^^^^^^^^^^^^^^
Error: AOT compilation failed
Bad state: Generating AOT kernel dill failed!


#0      PluginManager._compileAsAot (package:analysis_server/src/plugin/plugin_manager.dart:589)
#1      PluginManager._computeFiles (package:analysis_server/src/plugin/plugin_manager.dart:641)
#2      PluginManager.filesFor (package:analysis_server/src/plugin/plugin_manager.dart:347)
#3      PluginManager.addPluginToContextRoot (package:analysis_server/src/plugin/plugin_manager.dart:179)
#4      PluginWatcher._addLegacyPlugins (package:analysis_server/src/plugin/plugin_watcher.dart:102)
#5      PluginWatcher.addedDriver (package:analysis_server/src/plugin/plugin_watcher.dart:49)
#6      AnalysisDriverScheduler.add (package:analyzer/src/dart/analysis/driver.dart:2665)
#7      new AnalysisDriver (package:analyzer/src/dart/analysis/driver.dart:341)
#8      ContextBuilderImpl.createContext (package:analyzer/src/dart/analysis/context_builder.dart:157)
#9      new AnalysisContextCollectionImpl (package:analyzer/src/dart/analysis/analysis_context_collection.dart:122)
#10     ContextManagerImpl._createAnalysisContexts.performContextRebuildGuarded.performContextRebuild (package:analysis_server/src/context_manager.dart:596)
<asynchronous suspension>
#11     ContextManagerImpl._createAnalysisContexts.performContextRebuildGuarded (package:analysis_server/src/context_manager.dart:732)
<asynchronous suspension>
#12     _CancellingTaskQueue.queue.<anonymous closure> (package:analysis_server/src/context_manager.dart:1041)
<asynchronous suspension>
#13     ContextManagerImpl.setRoots (package:analysis_server/src/context_manager.dart:386)
<asynchronous suspension>
#14     LegacyAnalysisServer.setAnalysisRoots (package:analysis_server/src/legacy_analysis_server.dart:901)
<asynchronous suspension>
#15     AnalysisSetAnalysisRootsHandler.handle (package:analysis_server/src/handler/legacy/analysis_set_analysis_roots.dart:56)
<asynchronous suspension>
#16     LegacyAnalysisServer.handleRequest.<anonymous closure>.<anonymous closure> (package:analysis_server/src/legacy_analysis_server.dart:648)
<asynchronous suspension>
#17     OperationPerformanceImpl.runAsync (package:analyzer/src/util/performance/operation_performance.dart:201)
<asynchronous suspension>
#18     LegacyAnalysisServer.handleRequest.<anonymous closure> (package:analysis_server/src/legacy_analysis_server.dart:628)
<asynchronous suspension>
Analyzing address_field.dart...
```
