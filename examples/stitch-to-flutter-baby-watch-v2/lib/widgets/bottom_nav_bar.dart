import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_spacing.dart';

class BottomNavBar extends StatelessWidget {
  const BottomNavBar({super.key});

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
          _BottomNavItem(
            icon: Icons.home,
            label: 'Trang chủ',
            color: colorScheme.primary,
            textStyle: textTheme.labelSmall,
            onTap: () => context.go('/home'),
          ),
          // @converge:element navigate:devices
          _BottomNavItem(
            icon: Icons.devices,
            label: 'Thiết bị',
            color: colorScheme.onSurfaceVariant,
            textStyle: textTheme.labelSmall,
            onTap: () => context.go('/devices'),
          ),
          // @converge:element navigate:safety
          _BottomNavItem(
            icon: Icons.security,
            label: 'An toàn',
            color: colorScheme.onSurfaceVariant,
            textStyle: textTheme.labelSmall,
            onTap: () => context.go('/safe-zones'),
          ),
          // @converge:element navigate:settings
          _BottomNavItem(
            icon: Icons.settings,
            label: 'Cài đặt',
            color: colorScheme.onSurfaceVariant,
            textStyle: textTheme.labelSmall,
            onTap: () => context.go('/settings'),
          ),
        ],
      ),
    );
  }
}

class _BottomNavItem extends StatelessWidget {
  const _BottomNavItem({
    required this.icon,
    required this.label,
    required this.color,
    required this.textStyle,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final TextStyle? textStyle;
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
              style: textStyle?.copyWith(color: color),
            ),
          ],
        ),
      ),
    );
  }
}
