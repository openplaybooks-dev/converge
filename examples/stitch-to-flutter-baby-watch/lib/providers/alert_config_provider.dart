import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'alert_config_provider.g.dart';

@riverpod
AlertConfig alertConfig(AlertConfigRef ref) {
  return mockAlertConfig;
}