import 'package:flutter_test/flutter_test.dart';

import 'package:folio/app.dart';

void main() {
  testWidgets('App renders without crashing', (tester) async {
    await tester.pumpWidget(const FolioApp());
    expect(find.byType(FolioApp), findsOneWidget);
  });
}
