import 'package:freezed_annotation/freezed_annotation.dart';

@JsonEnum()
enum WeightUnit {
  kg,
  lbs,
}

@JsonEnum()
enum SymptomType {
  nausea,
  fatigue,
  headache,
  backPain,
  swelling,
  cramping,
  dizziness,
  other,
}

@JsonEnum()
enum ExerciseCategory {
  breathing,
  stretching,
  meditation,
}

@JsonEnum()
enum ArticleTopic {
  nutrition,
  bodyChanges,
  maternalCare,
  babyDevelopment,
}

@JsonEnum()
enum AppMode {
  pregnancy,
  wellness,
}
