import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:baby_watch/app.dart';

void main() {
  testWidgets('BabyWatchApp builds without throwing', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: BabyWatchApp()));
    await tester.pump();
    expect(find.byType(BabyWatchApp), findsOneWidget);
  });
}
