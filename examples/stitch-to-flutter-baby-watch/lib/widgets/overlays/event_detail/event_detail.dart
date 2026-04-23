import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

/// Bottom sheet overlay showing event detail — timestamp, duration,
/// safe zone context, and acknowledge status.
class EventDetail extends StatelessWidget {
  /// Event type label (e.g. "Alert Event").
  final String eventType;

  /// Event title (e.g. "Left Safe Zone").
  final String eventTitle;

  /// Formatted time display (e.g. "10:24 AM • 4 phút").
  final String timeDisplay;

  /// Beacon name (e.g. "Bé Na").
  final String beaconName;

  /// Safe zone name (e.g. "Home").
  final String safeZoneName;

  /// Whether the event has been acknowledged.
  final bool isAcknowledged;

  /// Called when the close button is pressed.
  final VoidCallback? onClose;

  const EventDetail({
    super.key,
    this.eventType = 'Alert Event',
    this.eventTitle = 'Left Safe Zone',
    this.timeDisplay = '10:24 AM • 4 phút',
    this.beaconName = 'Bé Na',
    this.safeZoneName = 'Home',
    this.isAcknowledged = true,
    this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    final alertColor = AppTheme.brandOnSurface;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppTheme.radiusLg),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceMd),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Container(
                width: 32,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppTheme.spaceMd),
                decoration: BoxDecoration(
                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                ),
              ),

              // Event header
              Padding(
                padding: const EdgeInsets.only(bottom: AppTheme.spaceMd),
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: colorScheme.errorContainer,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.warning,
                        color: colorScheme.error,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: AppTheme.spaceMd),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            eventType.toUpperCase(),
                            style: textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.05,
                              color: colorScheme.error,
                            ),
                          ),
                          const SizedBox(height: AppTheme.spaceXs),
                          Text(
                            eventTitle,
                            style: textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: colorScheme.onSurface,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Details card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                margin: const EdgeInsets.only(bottom: AppTheme.spaceMd),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                ),
                child: Column(
                  children: [
                    _DetailRow(
                      label: 'Thời gian',
                      value: timeDisplay,
                      colorScheme: colorScheme,
                      textTheme: textTheme,
                    ),
                    const SizedBox(height: AppTheme.spaceMd),
                    _DetailRow(
                      label: 'Beacon',
                      value: beaconName,
                      colorScheme: colorScheme,
                      textTheme: textTheme,
                    ),
                    const SizedBox(height: AppTheme.spaceMd),
                    _DetailRow(
                      label: 'Vùng an toàn',
                      value: safeZoneName,
                      colorScheme: colorScheme,
                      textTheme: textTheme,
                    ),
                    const SizedBox(height: AppTheme.spaceMd),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Trạng thái',
                          style: textTheme.bodyMedium?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: colorScheme.errorContainer,
                            borderRadius: BorderRadius.circular(
                              AppTheme.radiusFull,
                            ),
                          ),
                          child: Text(
                            isAcknowledged ? 'Đã xác nhận' : 'Chưa xác nhận',
                            style: textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: colorScheme.error,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Close button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  onPressed: onClose ?? () => Navigator.pop(context),
                  style: FilledButton.styleFrom(
                    backgroundColor: alertColor,
                    foregroundColor: colorScheme.onPrimary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                  ),
                  child: const Text('Đóng'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _DetailRow({
    required this.label,
    required this.value,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        Text(
          value,
          style: textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}