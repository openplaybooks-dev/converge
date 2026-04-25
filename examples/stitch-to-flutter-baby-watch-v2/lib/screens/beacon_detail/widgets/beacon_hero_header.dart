import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class BeaconHeroHeader extends StatelessWidget {
  const BeaconHeroHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: colorScheme.secondaryContainer,
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Icon(
            Icons.child_care,
            size: 24,
            color: colorScheme.secondary,
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bé Na',
                style: textTheme.headlineLarge
                    ?.copyWith(color: colorScheme.onSurface),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Beacon theo dõi của bé',
                style: textTheme.bodyMedium
                    ?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
