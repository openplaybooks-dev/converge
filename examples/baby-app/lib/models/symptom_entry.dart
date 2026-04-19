import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'symptom_entry.freezed.dart';
part 'symptom_entry.g.dart';

@freezed
abstract class SymptomEntry with _$SymptomEntry {
  const factory SymptomEntry({
    required String id,
    required DateTime date,
    required SymptomType type,
    required int severity,
    String? notes,
  }) = _SymptomEntry;

  factory SymptomEntry.fromJson(Map<String, dynamic> json) =>
      _$SymptomEntryFromJson(json);
}
