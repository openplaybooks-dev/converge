import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_spacing.dart';

class AppBottomNavBar extends StatelessWidget {
  const AppBottomNavBar({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Material(
      color: colorScheme.surfaceContainerLowest,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            // @converge:element navigate:home
            _BottomNavItem(
              icon: Icons.home,
              label: 'Trang chủ',
              color: colorScheme.primary,
              textTheme: textTheme,
              onTap: () => context.go('/home'),
            ),
            // @converge:element navigate:devices
            _BottomNavItem(
              icon: Icons.devices,
              label: 'Thiết bị',
              color: colorScheme.onSurfaceVariant,
              textTheme: textTheme,
              onTap: () => context.go('/devices'),
            ),
            // @converge:element navigate:safety
            _BottomNavItem(
              icon: Icons.security,
              label: 'An toàn',
              color: colorScheme.onSurfaceVariant,
              textTheme: textTheme,
              onTap: () => context.go('/safe-zones'),
            ),
            // @converge:element navigate:settings
            _BottomNavItem(
              icon: Icons.settings,
              label: 'Cài đặt',
              color: colorScheme.onSurfaceVariant,
              textTheme: textTheme,
              onTap: () => context.go('/settings'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BottomNavItem extends StatelessWidget {
  const _BottomNavItem({
    required this.icon,
    required this.label,
    required this.color,
    required this.textTheme,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final TextTheme textTheme;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 24, color: color),
            const SizedBox(height: AppSpacing.xs),
            Text(
              label,
              style: textTheme.labelSmall?.copyWith(color: color),
            ),
          ],
        ),
      ),
    );
  }
}
