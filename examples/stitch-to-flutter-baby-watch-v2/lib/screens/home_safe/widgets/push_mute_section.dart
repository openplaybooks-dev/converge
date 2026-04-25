import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class PushMuteSection extends StatelessWidget {
  const PushMuteSection({super.key});

  void _showMuteSnack(BuildContext context, String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Đã tạm dừng thông báo $label')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Card(
      color: colorScheme.surfaceContainerLowest,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tạm dừng thông báo',
              style: textTheme.titleMedium?.copyWith(
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Tắt cảnh báo tạm thời khi bạn đang ở cùng bé.',
              style: textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                // @converge:element action:mute-5min
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _showMuteSnack(context, '5 phút'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.surfaceContainerLowest,
                      foregroundColor: colorScheme.onSurface,
                    ),
                    child: Text(
                      '5 phút',
                      style: textTheme.labelLarge,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                // @converge:element action:mute-10min
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _showMuteSnack(context, '10 phút'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.surfaceContainerLowest,
                      foregroundColor: colorScheme.onSurface,
                    ),
                    child: Text(
                      '10 phút',
                      style: textTheme.labelLarge,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                // @converge:element action:mute-15min
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _showMuteSnack(context, '15 phút'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.surfaceContainerLowest,
                      foregroundColor: colorScheme.onSurface,
                    ),
                    child: Text(
                      '15 phút',
                      style: textTheme.labelLarge,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
