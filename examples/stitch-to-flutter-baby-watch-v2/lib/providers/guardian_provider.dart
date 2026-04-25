import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:baby_watch/data/mock_data.dart';
import 'package:baby_watch/models/models.dart';

part 'guardian_provider.g.dart';

@riverpod
class Guardians extends _$Guardians {
  @override
  List<Guardian> build() => List<Guardian>.unmodifiable(mockGuardians);
}
