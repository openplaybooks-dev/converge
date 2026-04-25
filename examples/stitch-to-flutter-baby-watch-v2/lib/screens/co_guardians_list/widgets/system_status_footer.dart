import 'package:flutter/material.dart';

import 'package:baby_watch/widgets/pulsing_dot.dart';

import '../../../theme/app_spacing.dart';

class SystemStatusFooter extends StatelessWidget {
  const SystemStatusFooter({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(AppRadius.full),
                boxShadow: const [AppShadows.soft],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  PulsingDot(color: colorScheme.tertiary),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'Hệ thống đang hoạt động',
                    style: textTheme.labelSmall
                        ?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

