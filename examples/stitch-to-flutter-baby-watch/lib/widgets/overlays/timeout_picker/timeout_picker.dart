import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class TimeoutPicker extends StatelessWidget {
  final int? selectedMinutes;
  final ValueChanged<int>? onSelected;

  const TimeoutPicker({
    super.key,
    this.selectedMinutes,
    this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppTheme.radiusLg),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(height: AppTheme.spaceXs),
          // Drag handle
          Center(
            child: Container(
              width: 32,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.brandBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          SizedBox(height: AppTheme.spaceLg),
          // Title
          Padding(
            padding: EdgeInsets.symmetric(horizontal: AppTheme.spaceMd),
            child: Text(
              'Chọn thời gian chờ',
              style: textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppTheme.brandOnSurface,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          SizedBox(height: AppTheme.spaceSm),
          // Subtitle
          Padding(
            padding: EdgeInsets.symmetric(horizontal: AppTheme.spaceMd),
            child: Text(
              'Thời gian trước khi phát cảnh báo khi mất kết nối beacon',
              style: textTheme.bodyMedium?.copyWith(
                color: AppTheme.brandOnSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          SizedBox(height: AppTheme.spaceLg),
          // Preset options
          Padding(
            padding: EdgeInsets.symmetric(horizontal: AppTheme.spaceMd),
            child: Column(
              children: [
                _TimeoutOption(
                  minutes: 2,
                  label: '2 phút',
                  isRecommended: true,
                  isSelected: selectedMinutes == 2,
                  textTheme: textTheme,
                  onTap: () => onSelected?.call(2),
                ),
                SizedBox(height: AppTheme.spaceMd),
                _TimeoutOption(
                  minutes: 5,
                  label: '5 phút',
                  isSelected: selectedMinutes == 5,
                  textTheme: textTheme,
                  onTap: () => onSelected?.call(5),
                ),
                SizedBox(height: AppTheme.spaceMd),
                _TimeoutOption(
                  minutes: 10,
                  label: '10 phút',
                  isSelected: selectedMinutes == 10,
                  textTheme: textTheme,
                  onTap: () => onSelected?.call(10),
                ),
                SizedBox(height: AppTheme.spaceMd),
                _TimeoutOption(
                  minutes: 15,
                  label: '15 phút',
                  isSelected: selectedMinutes == 15,
                  textTheme: textTheme,
                  onTap: () => onSelected?.call(15),
                ),
              ],
            ),
          ),
          // Custom option
          Padding(
            padding: EdgeInsets.only(
              top: AppTheme.spaceLg,
              left: AppTheme.spaceMd,
              right: AppTheme.spaceMd,
            ),
            child: Container(
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: AppTheme.brandBorder,
                  ),
                ),
              ),
              child: TextButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Mở tùy chỉnh thời gian')),
                  );
                },
                style: TextButton.styleFrom(
                  padding: EdgeInsets.symmetric(
                    vertical: AppTheme.spaceMd,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.edit_outlined,
                      size: 20,
                      color: AppTheme.brandGreen,
                    ),
                    SizedBox(width: AppTheme.spaceSm),
                    Text(
                      'Tùy chỉnh thời gian',
                      style: textTheme.bodyMedium?.copyWith(
                        color: AppTheme.brandGreen,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(height: MediaQuery.of(context).padding.bottom + AppTheme.spaceMd),
        ],
      ),
    );
  }
}

class _TimeoutOption extends StatelessWidget {
  final int minutes;
  final String label;
  final bool isRecommended;
  final bool isSelected;
  final TextTheme textTheme;
  final VoidCallback? onTap;

  const _TimeoutOption({
    required this.minutes,
    required this.label,
    this.isRecommended = false,
    required this.isSelected,
    required this.textTheme,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isPrimary = isSelected || isRecommended;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: AppTheme.spaceLg,
          vertical: AppTheme.spaceMd,
        ),
        decoration: BoxDecoration(
          color: isPrimary
              ? AppTheme.brandGreenLight
              : AppTheme.brandSurface,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: textTheme.bodyLarge?.copyWith(
                  color: AppTheme.brandOnSurface,
                  fontWeight: isPrimary ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ),
            if (isRecommended)
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: AppTheme.spaceSm,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.brandGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppTheme.spaceXs),
                ),
                child: Text(
                  'Khuyến nghị',
                  style: textTheme.labelSmall?.copyWith(
                    color: AppTheme.brandGreen,
                  ),
                ),
              ),
            if (isSelected && !isRecommended)
              Icon(
                Icons.check,
                size: 20,
                color: AppTheme.brandGreen,
              ),
          ],
        ),
      ),
    );
  }
}