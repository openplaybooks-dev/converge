import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';

part 'doctor_visit_provider.g.dart';

@riverpod
List<DoctorVisit> doctorVisits(Ref ref) {
  return mockDoctorVisits;
}
