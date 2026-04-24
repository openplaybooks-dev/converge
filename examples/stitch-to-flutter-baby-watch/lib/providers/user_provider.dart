import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'user_provider.g.dart';

@riverpod
User user(UserRef ref) {
  return mockUsers.first;
}
