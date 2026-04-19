import 'package:freezed_annotation/freezed_annotation.dart';

part 'self_care_check_state.freezed.dart';
part 'self_care_check_state.g.dart';

@freezed
abstract class SelfCareCheckState with _$SelfCareCheckState {
  const factory SelfCareCheckState({
    required int weekNumber,
    required DateTime date,
    required List<String> completedItems,
  }) = _SelfCareCheckState;

  factory SelfCareCheckState.fromJson(Map<String, dynamic> json) =>
      _$SelfCareCheckStateFromJson(json);
}
