import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:baby_watch/data/mock_data.dart';
import 'package:baby_watch/models/models.dart';

part 'invite_provider.g.dart';

@riverpod
class Invites extends _$Invites {
  @override
  List<Invite> build() => List<Invite>.unmodifiable(mockInvites);
}
