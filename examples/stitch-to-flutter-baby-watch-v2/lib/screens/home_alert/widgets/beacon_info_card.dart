import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_spacing.dart';
import '../../../theme/app_theme.dart';

class BeaconInfoCard extends StatelessWidget {
  const BeaconInfoCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    final appSemantic = theme.extension<AppSemanticColors>()!;

    return Card(
      color: colorScheme.surfaceContainerLowest,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: appSemantic.alertPeach,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(
                    Icons.bluetooth,
                    color: colorScheme.error,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Beacon: Bé Na',
                        style: textTheme.titleMedium
                            ?.copyWith(color: colorScheme.onSurface),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: colorScheme.error,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Text(
                            'Xa (Far)',
                            style: textTheme.bodySmall
                                ?.copyWith(color: colorScheme.error),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // @converge:element navigate:beacon-settings
                IconButton(
                  icon: Icon(
                    Icons.settings,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  tooltip: 'Cài đặt beacon',
                  onPressed: () => context.push('/settings'),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            // @converge:element navigate:beacon-detail
            InkWell(
              onTap: () => context.push('/devices'),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: AppSpacing.sm,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Chi tiết beacon',
                        style: textTheme.labelLarge
                            ?.copyWith(color: colorScheme.onSurface),
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
