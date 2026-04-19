import 'package:freezed_annotation/freezed_annotation.dart';

part 'doctor_visit.freezed.dart';
part 'doctor_visit.g.dart';

@freezed
abstract class DoctorVisit with _$DoctorVisit {
  const factory DoctorVisit({
    required String id,
    required DateTime date,
    String? doctorName,
    required String summary,
    String? notes,
  }) = _DoctorVisit;

  factory DoctorVisit.fromJson(Map<String, dynamic> json) =>
      _$DoctorVisitFromJson(json);
}
