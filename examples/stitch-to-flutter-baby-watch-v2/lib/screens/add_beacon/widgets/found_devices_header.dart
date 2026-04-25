import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class FoundDevicesHeader extends StatelessWidget {
  const FoundDevicesHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Row(
      children: [
        Text(
          'Thiết bị tìm thấy',
          style: textTheme.titleLarge?.copyWith(
            color: colorScheme.onSurface,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Chip(
          label: Text(
            '3 Mới',
            style: textTheme.labelSmall?.copyWith(
              color: colorScheme.tertiary,
            ),
          ),
          backgroundColor: colorScheme.tertiaryContainer,
        ),
      ],
    );
  }
}
