import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';

part 'cycle_entry_provider.g.dart';

@riverpod
List<CycleEntry> cycleEntries(Ref ref) {
  return mockCycleEntries;
}
