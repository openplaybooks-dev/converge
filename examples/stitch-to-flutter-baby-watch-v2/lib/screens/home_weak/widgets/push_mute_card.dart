import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class PushMuteCard extends StatelessWidget {
  const PushMuteCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Card(
      color: colorScheme.surfaceContainerLow,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Tạm dừng thông báo',
                  style: textTheme.titleMedium
                      ?.copyWith(color: colorScheme.onSurface),
                ),
                const SizedBox(width: AppSpacing.sm),
                Icon(
                  Icons.notifications_off,
                  size: 24,
                  color: colorScheme.onSurfaceVariant,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                // @converge:element action:mute-5min
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.surfaceContainerLowest,
                      foregroundColor: colorScheme.onSurface,
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Đã tạm dừng thông báo trong 5 phút'),
                        ),
                      );
                    },
                    child: Text(
                      '5m',
                      style: textTheme.labelLarge,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                // @converge:element action:mute-10min
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.surfaceContainerLowest,
                      foregroundColor: colorScheme.onSurface,
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Đã tạm dừng thông báo trong 10 phút'),
                        ),
                      );
                    },
                    child: Text(
                      '10m',
                      style: textTheme.labelLarge,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                // @converge:element action:mute-15min
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.surfaceContainerLowest,
                      foregroundColor: colorScheme.onSurface,
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Đã tạm dừng thông báo trong 15 phút'),
                        ),
                      );
                    },
                    child: Text(
                      '15m',
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
