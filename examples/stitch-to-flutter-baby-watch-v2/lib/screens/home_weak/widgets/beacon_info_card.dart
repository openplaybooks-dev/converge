import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_spacing.dart';

class BeaconInfoCard extends StatelessWidget {
  const BeaconInfoCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Card(
      color: colorScheme.surfaceContainerLowest,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainer,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(
                    Icons.child_care,
                    size: 24,
                    color: colorScheme.primary,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Bé Na',
                        style: textTheme.titleMedium?.copyWith(
                          color: colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Apple AirTag • Beacon',
                        style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Xa (Yếu)',
                      style: textTheme.titleMedium
                          ?.copyWith(color: colorScheme.error),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Khoảng cách',
                      style: textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // @converge:element navigate:beacon-detail
          InkWell(
            onTap: () => context.push('/devices'),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // @converge:element navigate:beacon-detail
                  TextButton(
                    onPressed: () => context.push('/devices'),
                    child: Text(
                      'Chi tiết beacon',
                      style: textTheme.labelLarge
                          ?.copyWith(color: colorScheme.onSurface),
                    ),
                  ),
                  Icon(
                    Icons.chevron_right,
                    size: 24,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
