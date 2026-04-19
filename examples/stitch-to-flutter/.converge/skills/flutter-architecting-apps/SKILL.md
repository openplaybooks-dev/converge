---
name: flutter-architecting-apps
description: Architects scalable Flutter applications using layered separation of concerns. Use when structuring a new app or refactoring existing code into maintainable layers.
---
# Architecting Flutter Applications

## Contents
- [Core Principles](#core-principles)
- [Architectural Layers](#architectural-layers)
- [Workflow: Implementing a Feature](#workflow-implementing-a-feature)
- [Examples](#examples)

## Core Principles

1. **Separation of Concerns:** Decouple UI rendering from business logic and data fetching by organizing code into distinct layers separated by feature.
2. **Single Source of Truth (SSOT):** Centralize application state and data in the Data layer. Only the SSOT component can modify its respective data.
3. **Unidirectional Data Flow (UDF):** State flows *down* from Data to UI. Events flow *up* from UI to Data.
4. **UI as State Function:** Widgets rebuild reactively when immutable state objects change: `UI = f(state)`.

## Architectural Layers

### UI Layer (Presentation)
- **Views:** Lean widgets focused on presentation. Minimal logic — only routing, animations, or simple UI conditionals.
- **ViewModels / Providers:** Manage UI state. Transform domain models into presentation-friendly formats. Trigger rebuilds when data changes.

### Logic Layer (Domain) — Optional
- **Use Cases / Interactors:** Orchestrate complex business logic involving multiple repositories.
- Omit for standard CRUD applications — connect Views directly to Repositories via Providers.

### Data Layer (Model)
- **Services:** Stateless API wrappers. Handle HTTP requests, platform APIs, system resources.
- **Repositories:** The SSOT. Handle caching, data transformation, and synchronization. The only layer allowed to mutate application data.

## File Organization

```
lib/
├── models/          # Domain models (Freezed data classes)
│   ├── novel.dart
│   └── models.dart  # Barrel export
├── data/            # Services, repositories, mock data
│   ├── mock_data.dart
│   └── novel_service.dart
├── providers/       # Riverpod providers (state management)
│   ├── novels_provider.dart
│   └── providers.dart  # Barrel export
├── screens/         # Screen widgets (one folder per screen)
│   ├── home_feed/
│   │   ├── home_feed_screen.dart
│   │   └── _widgets/
│   └── novel_detail/
│       └── novel_detail_screen.dart
├── widgets/         # Shared reusable widgets
├── router/          # GoRouter configuration
│   └── app_router.dart
├── theme/           # ThemeData and design tokens
│   └── app_theme.dart
├── app.dart         # MaterialApp.router setup
└── main.dart        # Entry point with ProviderScope
```

## Workflow: Implementing a Feature

Follow this sequential process:

1. **Define Domain Models** — Create Freezed data classes with all fields, types, and relationships.
2. **Implement Services** — Create stateless API/data source wrappers.
3. **Implement Repositories** — Create SSOT classes that cache, transform, and expose data.
4. **Implement Providers** — Create Riverpod providers that wrap repositories and expose state to the UI.
5. **Implement Views** — Create screen widgets that consume providers via `ConsumerWidget` and `ref.watch()`.
6. **Validate** — Run `dart analyze`, widget tests, and integration tests.

## Examples

### Service (Data Layer)

```dart
class NovelApiService {
  final http.Client _client;
  NovelApiService({required http.Client client}) : _client = client;

  Future<List<Novel>> fetchNovels() async {
    final uri = Uri.https('api.example.com', '/novels');
    final response = await _client.get(uri);
    if (response.statusCode == 200) {
      final list = jsonDecode(response.body) as List;
      return list.map((json) => Novel.fromJson(json)).toList();
    }
    throw Exception('Failed to load novels');
  }
}
```

### Repository (SSOT)

```dart
class NovelRepository {
  final NovelApiService _service;
  List<Novel>? _cache;

  NovelRepository({required NovelApiService service}) : _service = service;

  Future<List<Novel>> getNovels({bool forceRefresh = false}) async {
    if (_cache != null && !forceRefresh) return _cache!;
    _cache = await _service.fetchNovels();
    return _cache!;
  }
}
```

### Provider (Logic Layer)

```dart
@riverpod
class NovelsNotifier extends _$NovelsNotifier {
  @override
  Future<List<Novel>> build() async {
    return ref.read(novelRepositoryProvider).getNovels();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = AsyncData(
      await ref.read(novelRepositoryProvider).getNovels(forceRefresh: true),
    );
  }
}
```

### View (UI Layer)

```dart
class HomeFeedScreen extends ConsumerWidget {
  const HomeFeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final novelsAsync = ref.watch(novelsNotifierProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: novelsAsync.when(
        data: (novels) => ListView.builder(
          itemCount: novels.length,
          itemBuilder: (_, i) => NovelCard(novel: novels[i]),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
```
