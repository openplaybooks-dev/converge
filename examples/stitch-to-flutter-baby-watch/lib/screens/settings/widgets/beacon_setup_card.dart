import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class BeaconSetupCard extends StatelessWidget {
  const BeaconSetupCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: [
          BoxShadow(
            color: AppTheme.brandShadow,
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'RSSI THRESHOLD',
                    style: textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.05,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    '-75 dBm',
                    style: textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: colorScheme.onSurface,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                height: 8,
                decoration: BoxDecoration(
                  color: AppTheme.brandSurfaceContainer,
                  borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                ),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: FractionallySizedBox(
                    widthFactor: 0.65,
                    child: Container(
                      decoration: BoxDecoration(
                        color: colorScheme.onSurface,
                        borderRadius:
                            BorderRadius.circular(AppTheme.radiusFull),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Adjust the sensitivity of proximity detection. A lower dBm value requires the device to be closer.',
                style: textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                  height: 1.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.radiusLg),
          Container(
            padding: const EdgeInsets.all(AppTheme.radiusMd),
            decoration: BoxDecoration(
              color: AppTheme.brandSurface,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.history_toggle_off,
                  color: colorScheme.onSurfaceVariant,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'SCAN INTERVAL',
                    style: textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
                  ),
                ),
                Row(
                  children: [
                    Text(
                      '15 seconds',
                      style: textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.unfold_more,
                      size: 20,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
