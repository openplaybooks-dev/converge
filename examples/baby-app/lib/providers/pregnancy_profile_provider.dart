import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';

part 'pregnancy_profile_provider.g.dart';

@riverpod
PregnancyProfile pregnancyProfile(Ref ref) {
  return mockProfile;
}
