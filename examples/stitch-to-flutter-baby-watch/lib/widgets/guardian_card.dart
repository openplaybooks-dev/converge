import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class GuardianCard extends StatelessWidget {
  final String initial;
  final String name;
  final String role;
  final Color roleColor;
  final Color roleTextColor;
  final String status;
  final Color statusBgColor;
  final Color statusTextColor;
  final Color avatarBgColor;
  final Color avatarTextColor;
  final bool isOnline;

  const GuardianCard({
    super.key,
    required this.initial,
    required this.name,
    required this.role,
    required this.roleColor,
    required this.roleTextColor,
    required this.status,
    required this.statusBgColor,
    required this.statusTextColor,
    required this.avatarBgColor,
    required this.avatarTextColor,
    required this.isOnline,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: const [
          BoxShadow(
            color: AppTheme.brandShadow,
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: avatarBgColor,
              border: Border.all(color: colorScheme.surface, width: 2),
              boxShadow: const [
                BoxShadow(
                  color: AppTheme.brandShadowDark,
                  blurRadius: 4,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Center(
              child: Text(
                initial,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: avatarTextColor,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppTheme.spaceMd),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppTheme.brandOnSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: roleColor,
                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                  ),
                  child: Text(
                    role,
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: roleTextColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Status
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: statusBgColor,
              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isOnline) ...[
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: statusTextColor,
                    ),
                  ),
                  const SizedBox(width: 6),
                ],
                Text(
                  status,
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: statusTextColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
