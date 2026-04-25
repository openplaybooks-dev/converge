import 'package:flutter/material.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import 'enums.dart';

part 'insight.freezed.dart';
part 'insight.g.dart';

@freezed
sealed class Insight with _$Insight {
  const factory Insight({
    required InsightKey key,
    required String title,
    required String subtitle,
    @JsonKey(includeFromJson: false, includeToJson: false) IconData? icon,
  }) = _Insight;

  factory Insight.fromJson(Map<String, dynamic> json) =>
      _$InsightFromJson(json);
}
