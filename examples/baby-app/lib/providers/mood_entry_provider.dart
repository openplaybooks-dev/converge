import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';

part 'mood_entry_provider.g.dart';

@riverpod
List<MoodEntry> moodEntries(Ref ref) {
  return mockMoodEntries;
}
