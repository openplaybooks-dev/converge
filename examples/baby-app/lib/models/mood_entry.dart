import 'package:freezed_annotation/freezed_annotation.dart';

part 'mood_entry.freezed.dart';
part 'mood_entry.g.dart';

@freezed
abstract class MoodEntry with _$MoodEntry {
  const factory MoodEntry({
    required String id,
    required DateTime date,
    required int moodLevel,
    required int energyLevel,
    String? notes,
  }) = _MoodEntry;

  factory MoodEntry.fromJson(Map<String, dynamic> json) =>
      _$MoodEntryFromJson(json);
}
