import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_spacing.dart';
import '../../../theme/app_theme.dart';

class BeaconStrip extends StatelessWidget {
  const BeaconStrip({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    final appSemantic = theme.extension<AppSemanticColors>()!;

    return Card(
      color: colorScheme.surfaceContainerLowest,
      clipBehavior: Clip.antiAlias,
      child:
          // @converge:element navigate:beacon-detail
          InkWell(
        onTap: () => context.push('/devices'),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: appSemantic.mint,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.sensors,
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
                      'Đang ở gần • 98% Pin',
                      style: textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              // @converge:element navigate:beacon-detail
              TextButton.icon(
                onPressed: () => context.push('/devices'),
                icon: Text(
                  'Chi tiết beacon',
                  style: textTheme.labelLarge?.copyWith(
                    color: colorScheme.primary,
                  ),
                ),
                label: Icon(
                  Icons.chevron_right,
                  size: 24,
                  color: colorScheme.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
