import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class SafeZoneCard extends StatelessWidget {
  const SafeZoneCard({
    super.key,
    required this.icon,
    required this.title,
    required this.radiusLabel,
    required this.address,
    required this.isActive,
  });

  final IconData icon;
  final String title;
  final String radiusLabel;
  final String address;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    final radiusBadgeBg = isActive
        ? colorScheme.tertiaryContainer
        : colorScheme.surfaceContainerHigh;
    final radiusBadgeFg =
        isActive ? colorScheme.tertiary : colorScheme.onSurfaceVariant;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppRadius.md),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33E7E3DC),
            offset: Offset(0, 4),
            blurRadius: 12,
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerLow,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: colorScheme.onSurface, size: 24),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        title,
                        style: textTheme.titleMedium?.copyWith(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w700,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: radiusBadgeBg,
                        borderRadius: BorderRadius.circular(AppRadius.full),
                      ),
                      child: Text(
                        radiusLabel,
                        style: textTheme.labelSmall?.copyWith(
                          color: radiusBadgeFg,
                          fontWeight: FontWeight.w700,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  address,
                  style: textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          _ZoneToggle(isActive: isActive),
          const SizedBox(width: AppSpacing.sm),
          // @converge:element action:edit-zone
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            color: colorScheme.outline,
            tooltip: 'Chỉnh sửa',
            onPressed: () {
              showModalBottomSheet<void>(
                context: context,
                builder: (_) => const Placeholder(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ZoneToggle extends StatelessWidget {
  const _ZoneToggle({required this.isActive});

  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: 48,
      height: 24,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isActive ? colorScheme.tertiary : colorScheme.outlineVariant,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Row(
        mainAxisAlignment:
            isActive ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          Container(
            width: 16,
            height: 16,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerLowest,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }
}
