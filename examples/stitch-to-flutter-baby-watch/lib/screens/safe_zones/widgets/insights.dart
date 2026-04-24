import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../theme/app_theme.dart';

class Insights extends StatelessWidget {
  const Insights({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(AppTheme.spaceMd),
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerLow,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.notifications_active,
                  color: colorScheme.onSurfaceVariant,
                  size: 20,
                ),
                const SizedBox(height: AppTheme.spaceSm),
                Text(
                  '24 Alerts',
                  style: textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                Text(
                  "This week's entry/exit events",
                  style: textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: AppTheme.spaceMd),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(AppTheme.spaceMd),
            decoration: BoxDecoration(
              color: colorScheme.tertiaryContainer,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.battery_full,
                  color: colorScheme.tertiary,
                  size: 20,
                  fill: 1,
                ),
                const SizedBox(height: AppTheme.spaceSm),
                Text(
                  '98% Secure',
                  style: textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: colorScheme.tertiary,
                  ),
                ),
                Text(
                  'Optimal zone coverage',
                  style: textTheme.bodySmall?.copyWith(
                    color: colorScheme.tertiary.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    ).animate().fadeIn(delay: 400.ms);
  }
}
