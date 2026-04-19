# Flutter Riverpod Patterns Skill

Production patterns for state management with Riverpod 2.x in Flutter.

## Provider Types

### 1. Simple Provider (read-only data)

```dart
@riverpod
List<Novel> novels(Ref ref) {
  return mockNovels;
}
```

### 2. AsyncNotifier Provider (async data with mutations)

```dart
@riverpod
class NovelsNotifier extends _$NovelsNotifier {
  @override
  Future<List<Novel>> build() async {
    return _loadNovels();
  }

  Future<List<Novel>> _loadNovels() async {
    // In production: API call
    // For now: return mock data
    return mockNovels;
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = AsyncData(await _loadNovels());
  }
}
```

### 3. StateNotifier Provider (sync state with mutations)

```dart
@riverpod
class LibraryNotifier extends _$LibraryNotifier {
  @override
  LibraryState build() {
    return LibraryState(
      reading: [],
      completed: [],
      wishlist: [],
    );
  }

  void addToReading(Novel novel) {
    state = state.copyWith(
      reading: [...state.reading, novel],
    );
  }

  void moveToCompleted(String novelId) {
    final novel = state.reading.firstWhere((n) => n.id == novelId);
    state = state.copyWith(
      reading: state.reading.where((n) => n.id != novelId).toList(),
      completed: [...state.completed, novel],
    );
  }
}
```

### 4. Family Provider (parameterized)

```dart
@riverpod
Future<Novel> novelById(Ref ref, String id) async {
  final novels = await ref.watch(novelsProvider.future);
  return novels.firstWhere((n) => n.id == id);
}
```

## Consuming Providers in Widgets

### ConsumerWidget (stateless)

```dart
class HomeFeedScreen extends ConsumerWidget {
  const HomeFeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final novels = ref.watch(novelsProvider);

    return novels.when(
      data: (data) => ListView.builder(
        itemCount: data.length,
        itemBuilder: (context, index) => NovelCard(novel: data[index]),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, st) => Center(child: Text('Error: $e')),
    );
  }
}
```

### ConsumerStatefulWidget (with local state)

```dart
class BrowseScreen extends ConsumerStatefulWidget {
  const BrowseScreen({super.key});

  @override
  ConsumerState<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends ConsumerState<BrowseScreen> {
  String _selectedGenre = 'All';

  @override
  Widget build(BuildContext context) {
    final novels = ref.watch(novelsProvider);
    // ... filter by _selectedGenre
  }
}
```

## File Organization

```
lib/providers/
├── novels_provider.dart       # Novel list + CRUD
├── library_provider.dart      # User's library state
├── reader_settings_provider.dart  # Reader preferences
├── audio_player_provider.dart     # Audio playback state
└── providers.dart             # Barrel export
```

## Rules

1. One provider file per domain entity
2. Use `@riverpod` annotation (code-gen) over manual providers
3. Run `dart run build_runner build` after creating/modifying providers
4. Export all from `lib/providers/providers.dart` barrel file
5. Provider names follow pattern: `{entity}Provider`, `{entity}NotifierProvider`
