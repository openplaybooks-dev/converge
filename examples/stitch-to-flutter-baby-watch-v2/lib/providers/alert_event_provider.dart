import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:baby_watch/data/mock_data.dart';
import 'package:baby_watch/models/models.dart';

part 'alert_event_provider.g.dart';

@riverpod
class AlertEvents extends _$AlertEvents {
  @override
  List<AlertEvent> build() => List<AlertEvent>.unmodifiable(mockAlertEvents);
}
