---
name: flutter-testing-apps
description: Implements unit, widget, and integration tests for a Flutter app. Use when ensuring code quality and preventing regressions through automated testing.
---
# Testing Flutter Applications

## Contents
- [Core Testing Strategies](#core-testing-strategies)
- [Architectural Testing Guidelines](#architectural-testing-guidelines)
- [Workflows](#workflows)
- [Examples](#examples)

## Core Testing Strategies

Balance your testing suite across three categories to optimize for confidence, maintenance cost, and execution speed.

### Unit Tests
Verify the correctness of a single function, method, or class.
- Mock all external dependencies.
- Do not involve disk I/O, screen rendering, or user actions.
- Execute using the `test` or `flutter_test` package.

### Widget Tests
Ensure a single widget's UI looks and interacts as expected.
- Provide widget lifecycle context using `WidgetTester`.
- Use `Finder` classes to locate widgets and `Matcher` constants to verify state.
- Test views and UI interactions without the full application.

### Integration Tests
Validate how individual pieces work together and capture performance metrics on real devices.
- Add the `integration_test` package as a dependency.
- Run on physical devices, OS emulators, or Firebase Test Lab.
- Prioritize for routing, dependency injection, and critical user flows.

## Architectural Testing Guidelines

Design for observability and testability:
- **ViewModels/Providers**: Unit test every provider. Test UI logic without Flutter framework dependency.
- **Repositories & Services**: Unit test with mocked data sources (HTTP clients, databases).
- **Views**: Widget test all views. Pass faked or mocked providers to isolate UI.
- **Fakes over Mocks**: Prefer `Fake` implementations over mocking libraries for well-defined inputs and outputs.

## Workflows

### Implementing a Component Test Suite
- [ ] Create `Fake` implementations for Repositories or Services.
- [ ] Write Unit Tests for the Repository (mocking API/Database).
- [ ] Write Unit Tests for the ViewModel/Provider (injecting Fakes).
- [ ] Write Widget Tests for the View (injecting providers and Fakes).
- [ ] Write an Integration Test for the critical path.
- [ ] Review coverage and fix missing edge cases.

### Running Integration Tests
- **Mobile (Local):** `flutter test integration_test/app_test.dart`
- **Web:** Launch ChromeDriver, then `flutter drive --driver=test_driver/integration_test.dart --target=integration_test/app_test.dart -d chrome`

## Examples

### ViewModel/Provider Unit Test

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('HomeViewModel tests', () {
    test('Load bookings successfully', () {
      final viewModel = HomeViewModel(
        bookingRepository: FakeBookingRepository()..createBooking(kBooking),
        userRepository: FakeUserRepository(),
      );
      expect(viewModel.bookings.isNotEmpty, true);
    });
  });
}
```

### View Widget Test

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('HomeScreen tests', () {
    late HomeViewModel viewModel;

    setUp(() {
      viewModel = HomeViewModel(
        bookingRepository: FakeBookingRepository()..createBooking(kBooking),
        userRepository: FakeUserRepository(),
      );
    });

    testWidgets('renders bookings list', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(home: HomeScreen(viewModel: viewModel)),
      );
      expect(find.byType(ListView), findsOneWidget);
      expect(find.text('Booking 1'), findsOneWidget);
    });
  });
}
```

### Integration Test

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('end-to-end test', () {
    testWidgets('tap FAB, verify counter', (tester) async {
      await tester.pumpWidget(const MyApp());
      expect(find.text('0'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('increment')));
      await tester.pumpAndSettle();

      expect(find.text('1'), findsOneWidget);
    });
  });
}
```
