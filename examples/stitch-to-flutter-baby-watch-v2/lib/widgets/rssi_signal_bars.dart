import 'package:flutter/material.dart';

import '../theme/app_spacing.dart';

class RssiSignalBars extends StatelessWidget {
  const RssiSignalBars({
    super.key,
    required this.filledBars,
    required this.rssi,
    this.totalBars = 4,
  });

  final int filledBars;
  final int rssi;
  final int totalBars;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Row(
          children: List.generate(
            totalBars,
            (index) => Padding(
              padding: const EdgeInsets.only(left: AppSpacing.xs),
              child: Container(
                width: 6,
                height: 12,
                decoration: BoxDecoration(
                  color: index < filledBars
                      ? colorScheme.onSurface
                      : colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          '$rssi RSSI',
          style: textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
