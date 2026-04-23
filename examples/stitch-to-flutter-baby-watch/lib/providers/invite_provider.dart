import 'package:folio/data/mock_data.dart';
import 'package:folio/models/models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'invite_provider.g.dart';

@riverpod
Invite invite(InviteRef ref) {
  return mockInvites.first;
}