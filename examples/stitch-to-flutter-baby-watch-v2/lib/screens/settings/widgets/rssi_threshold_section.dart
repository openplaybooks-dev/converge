import 'package:flutter/material.dart';

import '../../../theme/app_spacing.dart';

class RssiThresholdSection extends StatelessWidget {
  const RssiThresholdSection({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    // Map slider value (0..1) to dBm range (-95 to -45).
    final dbm = (-95 + (value * 50)).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'RSSI THRESHOLD',
              style: textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
            Text(
              '$dbm dBm',
              style: textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        // @converge:element action:adjust-rssi
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 8,
            activeTrackColor: colorScheme.onSurface,
            inactiveTrackColor: colorScheme.surfaceContainer,
            thumbColor: colorScheme.onSurface,
            overlayColor: colorScheme.onSurface.withValues(alpha: 0.08),
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 16),
          ),
          child: Slider(value: value, onChanged: onChanged),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Adjust the sensitivity of proximity detection. A lower dBm value requires the device to be closer.',
          style: textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}
