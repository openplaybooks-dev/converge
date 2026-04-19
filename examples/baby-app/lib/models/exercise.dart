import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'exercise.freezed.dart';
part 'exercise.g.dart';

@freezed
abstract class Exercise with _$Exercise {
  const factory Exercise({
    required String id,
    required String name,
    required ExerciseCategory category,
    required int durationSeconds,
    required List<String> steps,
    required List<String> benefits,
    String? difficulty,
    String? illustrationUrl,
  }) = _Exercise;

  factory Exercise.fromJson(Map<String, dynamic> json) =>
      _$ExerciseFromJson(json);
}
