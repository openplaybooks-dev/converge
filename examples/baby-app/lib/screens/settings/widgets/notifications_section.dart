import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class NotificationsSection extends StatefulWidget {
  const NotificationsSection({super.key, required this.animationIndex});

  final int animationIndex;

  @override
  State<NotificationsSection> createState() => _NotificationsSectionState();
}

class _NotificationsSectionState extends State<NotificationsSection> {
  bool _dailyReminders = true;
  bool _checkupAlerts = true;
  bool _selfCareNudges = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        boxShadow: AppTheme.shadowStandard,
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.screenHPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: AppTheme.spaceMd),
              child: Text(
                'Notifications',
                style: textTheme.headlineSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            _buildToggleRow(
              textTheme: textTheme,
              colorScheme: colorScheme,
              label: 'Daily Reminders',
              value: _dailyReminders,
              onChanged: (v) => setState(() => _dailyReminders = v),
            ),
            Container(
              height: 1,
              color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
            ),
            _buildToggleRow(
              textTheme: textTheme,
              colorScheme: colorScheme,
              label: 'Checkup Alerts',
              value: _checkupAlerts,
              onChanged: (v) => setState(() => _checkupAlerts = v),
            ),
            Container(
              height: 1,
              color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
            ),
            _buildToggleRow(
              textTheme: textTheme,
              colorScheme: colorScheme,
              label: 'Self-Care Nudges',
              value: _selfCareNudges,
              onChanged: (v) => setState(() => _selfCareNudges = v),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
          delay: AppTheme.staggerDelay * widget.animationIndex,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
          delay: AppTheme.staggerDelay * widget.animationIndex,
        );
  }

  Widget _buildToggleRow({
    required TextTheme textTheme,
    required ColorScheme colorScheme,
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Semantics(
      label: '$label, ${value ? 'on' : 'off'}',
      toggled: value,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: textTheme.titleLarge?.copyWith(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(
              width: 52,
              height: 30,
              child: Switch(
                value: value,
                onChanged: onChanged,
                activeThumbColor: AppTheme.surfaceColor,
                activeTrackColor: AppTheme.lilacColor,
                inactiveThumbColor: AppTheme.surfaceColor,
                inactiveTrackColor: AppTheme.chipBgColor,
                trackOutlineColor: WidgetStateProperty.all(
                  AppTheme.chipBgColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
