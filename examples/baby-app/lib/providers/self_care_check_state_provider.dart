import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';

part 'self_care_check_state_provider.g.dart';

@riverpod
List<SelfCareCheckState> selfCareCheckStates(Ref ref) {
  return mockSelfCareStates;
}
