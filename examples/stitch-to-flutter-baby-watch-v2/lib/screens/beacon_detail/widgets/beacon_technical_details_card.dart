import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class BeaconTechnicalDetailsCard extends StatefulWidget {
  const BeaconTechnicalDetailsCard({super.key});

  @override
  State<BeaconTechnicalDetailsCard> createState() =>
      _BeaconTechnicalDetailsCardState();
}

class _BeaconTechnicalDetailsCardState
    extends State<BeaconTechnicalDetailsCard> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Card(
      color: colorScheme.surfaceContainerLow,
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // @converge:element action:toggle-tech-details
            InkWell(
              onTap: () {
                setState(() {
                  _expanded = !_expanded;
                });
              },
              child: Row(
                children: [
                  Icon(
                    Icons.settings_ethernet,
                    size: 24,
                    color: colorScheme.outline,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Chi tiết kỹ thuật',
                      style: textTheme.titleMedium
                          ?.copyWith(color: colorScheme.onSurface),
                    ),
                  ),
                  Icon(
                    _expanded ? Icons.expand_less : Icons.expand_more,
                    size: 24,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ],
              ),
            ),
            if (_expanded) ...[
              const SizedBox(height: AppSpacing.md),
              Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'UUID',
                  style: textTheme.labelSmall
                      ?.copyWith(color: colorScheme.outline),
                ),
                const SizedBox(height: AppSpacing.xs),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  color: colorScheme.surface,
                  child: Text(
                    'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
                    style: textTheme.bodySmall
                        ?.copyWith(color: colorScheme.onSurface),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Major',
                            style: textTheme.labelSmall
                                ?.copyWith(color: colorScheme.outline),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(AppSpacing.sm),
                            color: colorScheme.surface,
                            child: Text(
                              '10001',
                              style: textTheme.bodySmall
                                  ?.copyWith(color: colorScheme.onSurface),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Minor',
                            style: textTheme.labelSmall
                                ?.copyWith(color: colorScheme.outline),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(AppSpacing.sm),
                            color: colorScheme.surface,
                            child: Text(
                              '20002',
                              style: textTheme.bodySmall
                                  ?.copyWith(color: colorScheme.onSurface),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            ],
          ],
        ),
      ),
    );
  }
}
