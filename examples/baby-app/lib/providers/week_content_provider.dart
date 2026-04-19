import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';

part 'week_content_provider.g.dart';

@riverpod
List<WeekContent> weekContent(Ref ref) {
  return mockWeekContent;
}
