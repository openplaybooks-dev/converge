import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class AlertActionButtons extends StatelessWidget {
  const AlertActionButtons({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // @converge:element action:acknowledge-alert
        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: colorScheme.primary,
            foregroundColor: colorScheme.onPrimary,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.md,
            ),
          ),
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Đã xác nhận cảnh báo')),
            );
          },
          icon: const Icon(Icons.task_alt),
          label: Text(
            'Tôi đã kiểm tra',
            style: textTheme.labelLarge
                ?.copyWith(color: colorScheme.onPrimary),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        // @converge:element action:toggle-mute
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: colorScheme.surface,
            foregroundColor: colorScheme.error,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.md,
            ),
          ),
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Đã tắt cảnh báo')),
            );
          },
          icon: const Icon(Icons.notifications_off),
          label: Text(
            'Tắt cảnh báo',
            style: textTheme.labelLarge?.copyWith(color: colorScheme.error),
          ),
        ),
      ],
    );
  }
}
