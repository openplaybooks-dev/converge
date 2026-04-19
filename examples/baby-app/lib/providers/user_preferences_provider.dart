import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';

part 'user_preferences_provider.g.dart';

@riverpod
UserPreferences userPreferences(Ref ref) {
  return mockUserPreferences;
}
