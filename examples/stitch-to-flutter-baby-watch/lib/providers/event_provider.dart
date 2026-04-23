import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_provider.g.dart';

@riverpod
Event event(EventRef ref) {
  return mockEvents.first;
}