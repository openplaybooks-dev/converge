import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';

part 'reminder_provider.g.dart';

@riverpod
List<Reminder> reminders(Ref ref) {
  return mockReminders;
}
