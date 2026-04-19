import 'package:freezed_annotation/freezed_annotation.dart';

import 'info_item.dart';

part 'week_content.freezed.dart';
part 'week_content.g.dart';

@freezed
abstract class WeekContent with _$WeekContent {
  const factory WeekContent({
    required int weekNumber,
    required String trimesterLabel,
    required String sizeComparison,
    String? milestoneTitle,
    String? milestoneDescription,
    required List<InfoItem> bodyChanges,
    required List<InfoItem> babyDevelopment,
    required List<String> selfCareItems,
    required List<String> exerciseGuides,
    required List<String> nutritionTips,
  }) = _WeekContent;

  factory WeekContent.fromJson(Map<String, dynamic> json) =>
      _$WeekContentFromJson(json);
}
