import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'package:folio/models/models.dart';

part 'info_item_provider.g.dart';

@riverpod
List<InfoItem> infoItems(Ref ref) {
  return [
    const InfoItem(
      title: 'Hearing develops',
      description: 'Your baby can now hear your voice and heartbeat.',
    ),
    const InfoItem(
      title: 'Weight gain',
      description: 'Your body is gaining weight to support the baby.',
    ),
  ];
}
