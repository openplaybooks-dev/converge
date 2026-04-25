import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';
import '../../../theme/app_theme.dart';

class AlertStatusPill extends StatelessWidget {
  const AlertStatusPill({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    final appSemantic = theme.extension<AppSemanticColors>()!;

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: appSemantic.alertPeach,
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error, size: 20, color: colorScheme.error),
            const SizedBox(width: AppSpacing.sm),
            Text(
              'Cảnh báo',
              style:
                  textTheme.labelLarge?.copyWith(color: colorScheme.error),
            ),
          ],
        ),
      ),
    );
  }
}
