import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:baby_watch/data/mock_data.dart';
import 'package:baby_watch/models/models.dart';

part 'insight_provider.g.dart';

@riverpod
class Insights extends _$Insights {
  @override
  List<Insight> build() => List<Insight>.unmodifiable(mockInsights);
}
