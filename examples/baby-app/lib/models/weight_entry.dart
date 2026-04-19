import 'package:freezed_annotation/freezed_annotation.dart';

part 'weight_entry.freezed.dart';
part 'weight_entry.g.dart';

@freezed
abstract class WeightEntry with _$WeightEntry {
  const factory WeightEntry({
    required String id,
    required DateTime date,
    required double value,
    String? notes,
  }) = _WeightEntry;

  factory WeightEntry.fromJson(Map<String, dynamic> json) =>
      _$WeightEntryFromJson(json);
}
