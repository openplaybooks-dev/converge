import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:baby_watch/theme/app_spacing.dart';

class BeaconDetailBottomNav extends StatelessWidget {
  const BeaconDetailBottomNav({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      color: colorScheme.surfaceContainerLowest,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          // @converge:element navigate:home
          IconButton(
            tooltip: 'Trang chủ',
            icon: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.home, color: colorScheme.onSurfaceVariant),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Trang chủ',
                  style: textTheme.labelSmall
                      ?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ],
            ),
            onPressed: () => context.go('/home'),
          ),
          // @converge:element navigate:devices
          IconButton(
            tooltip: 'Thiết bị',
            icon: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.devices, color: colorScheme.primary),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Thiết bị',
                  style: textTheme.labelSmall
                      ?.copyWith(color: colorScheme.primary),
                ),
              ],
            ),
            onPressed: () => context.go('/devices'),
          ),
          // @converge:element navigate:safety
          IconButton(
            tooltip: 'An toàn',
            icon: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.security, color: colorScheme.onSurfaceVariant),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'An toàn',
                  style: textTheme.labelSmall
                      ?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ],
            ),
            onPressed: () => context.go('/safe-zones'),
          ),
          // @converge:element navigate:settings
          IconButton(
            tooltip: 'Cài đặt',
            icon: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.settings, color: colorScheme.onSurfaceVariant),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Cài đặt',
                  style: textTheme.labelSmall
                      ?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ],
            ),
            onPressed: () => context.go('/settings'),
          ),
        ],
      ),
    );
  }
}
