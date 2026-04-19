---
name: flutter-managing-state
description: Manages application and ephemeral state in a Flutter app. Use when sharing data between widgets or handling complex UI state transitions.
---
# Managing State in Flutter

## Contents
- [Core Concepts](#core-concepts)
- [Architecture and Data Flow](#architecture-and-data-flow)
- [Workflow: Selecting a State Management Approach](#workflow-selecting-a-state-management-approach)
- [Workflow: Implementing MVVM with Provider](#workflow-implementing-mvvm-with-provider)
- [Examples](#examples)

## Core Concepts

Flutter's UI is declarative; it is built to reflect the current state of the app (`UI = f(state)`). When state changes, trigger a rebuild of the UI that depends on that state.

Distinguish between two primary types of state:
* **Ephemeral State (Local State):** State contained neatly within a single widget (e.g., current page in a `PageView`, current selected tab, animation progress). Manage this using a `StatefulWidget` and `setState()`.
* **App State (Shared State):** State shared across multiple parts of the app and maintained between user sessions (e.g., user preferences, login info, shopping cart contents). Manage this using advanced approaches like `InheritedWidget`, the `provider` package, or Riverpod.

## Architecture and Data Flow

Implement **Unidirectional Data Flow (UDF)** for scalable app state management.

* **Unidirectional Data Flow (UDF):** Enforce a strict flow where state flows *down* from the data layer, through the logic layer, to the UI layer. Events from user interactions flow *up* from the UI layer, to the logic layer, to the data layer.
* **Single Source of Truth (SSOT):** Ensure data changes always happen in the data layer (Repositories/Providers). The SSOT class must be the only class capable of modifying its respective data.
* **Model (Data Layer):** Handle low-level tasks like HTTP requests, data caching, and system resources using Repository classes.
* **ViewModel / Provider (Logic Layer):** Manage the UI state. Convert app data from the Model into UI State. Call `notifyListeners()` (Provider) or update state (Riverpod) to trigger UI rebuilds when data changes.
* **View (UI Layer):** Display the state provided by the ViewModel/Provider. Keep views lean; they should contain minimal logic (only routing, animations, or simple UI conditionals).

## Workflow: Selecting a State Management Approach

* **If managing Ephemeral State (single widget scope):**
  1. Subclass `StatefulWidget` and `State`.
  2. Store mutable state as private fields within the `State` class.
  3. Mutate state exclusively inside a `setState()` callback.

* **If managing App State (shared across widgets):**
  1. Implement providers (Riverpod or Provider package).
  2. Use `ChangeNotifier` or Riverpod's `Notifier`/`AsyncNotifier` to emit state updates.
  3. Consume state in widgets using `Consumer`/`ConsumerWidget` or `ref.watch()`.

## Workflow: Implementing State with Riverpod

1. Define the data model (Freezed classes or plain Dart).
2. Create the provider (`@riverpod` annotation for code generation, or manual).
3. Inject `ProviderScope` at the top of the widget tree.
4. Consume state in widgets using `ConsumerWidget` and `ref.watch()`.
5. Trigger mutations using `ref.read(provider.notifier).method()`.

## Examples

### Ephemeral State Implementation (`setState`)

```dart
class EphemeralCounter extends StatefulWidget {
  const EphemeralCounter({super.key});

  @override
  State<EphemeralCounter> createState() => _EphemeralCounterState();
}

class _EphemeralCounterState extends State<EphemeralCounter> {
  int _counter = 0;

  void _increment() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: _increment,
      child: Text('Count: $_counter'),
    );
  }
}
```

### App State Implementation (Riverpod)

```dart
// Provider
@riverpod
class CartNotifier extends _$CartNotifier {
  @override
  List<String> build() => [];

  void addItem(String item) {
    state = [...state, item];
  }

  void removeItem(String item) {
    state = state.where((i) => i != item).toList();
  }
}

// View
class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cartNotifierProvider);
    return Scaffold(
      body: ListView.builder(
        itemCount: items.length,
        itemBuilder: (_, index) => Text(items[index]),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => ref.read(cartNotifierProvider.notifier).addItem('New Item'),
        child: const Icon(Icons.add),
      ),
    );
  }
}
```
