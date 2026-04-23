import 'package:flutter/material.dart';

import '../../../widgets/signal_bars.dart';

class BeaconDeviceCard extends StatelessWidget {
  final String name;
  final String subtitle;
  final int rssi;
  final int signalStrength;
  final bool showTechnicalDetails;
  final bool primaryButton;
  final VoidCallback onConnect;
  final String? uuid;
  final String? major;
  final String? minor;

  const BeaconDeviceCard({
    super.key,
    required this.name,
    required this.subtitle,
    required this.rssi,
    required this.signalStrength,
    required this.showTechnicalDetails,
    required this.primaryButton,
    required this.onConnect,
    this.uuid,
    this.major,
    this.minor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: colorScheme.outlineVariant.withValues(alpha: 0.4),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  Icons.child_care,
                  color: colorScheme.onSurfaceVariant,
                  size: 30,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.cloud,
                          size: 14,
                          color: colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            subtitle,
                            style: textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  SignalBars(
                      strength: signalStrength, colorScheme: colorScheme),
                  const SizedBox(height: 4),
                  Text(
                    '$rssi RSSI',
                    style: textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.02,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (showTechnicalDetails) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerLow.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildTechDetail('UUID', uuid ?? '...', colorScheme),
                  _buildTechDetail('Major', major ?? '—', colorScheme),
                  _buildTechDetail('Minor', minor ?? '—', colorScheme),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: primaryButton
                ? ElevatedButton(
                    onPressed: onConnect,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.onSurface,
                      foregroundColor: colorScheme.surface,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(9999),
                      ),
                      textStyle: textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    child: const Text('Kết nối ngay'),
                  )
                : OutlinedButton(
                    onPressed: onConnect,
                    style: OutlinedButton.styleFrom(
                      backgroundColor: colorScheme.surfaceContainerHigh,
                      foregroundColor: colorScheme.onSurface,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(9999),
                      ),
                      textStyle: textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    child: const Text('Kết nối'),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTechDetail(String label, String value, ColorScheme colorScheme) {
    return Column(
      children: [
        Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.05,
            color: colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            fontFamily: 'monospace',
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
