import 'package:freezed_annotation/freezed_annotation.dart';

part 'cycle_entry.freezed.dart';
part 'cycle_entry.g.dart';

@freezed
abstract class CycleEntry with _$CycleEntry {
  const factory CycleEntry({
    required String id,
    required DateTime startDate,
    DateTime? endDate,
    required bool isIrregular,
    String? notes,
  }) = _CycleEntry;

  factory CycleEntry.fromJson(Map<String, dynamic> json) =>
      _$CycleEntryFromJson(json);
}
