import 'package:freezed_annotation/freezed_annotation.dart';

part 'info_item.freezed.dart';
part 'info_item.g.dart';

@freezed
abstract class InfoItem with _$InfoItem {
  const factory InfoItem({
    required String title,
    required String description,
  }) = _InfoItem;

  factory InfoItem.fromJson(Map<String, dynamic> json) =>
      _$InfoItemFromJson(json);
}
