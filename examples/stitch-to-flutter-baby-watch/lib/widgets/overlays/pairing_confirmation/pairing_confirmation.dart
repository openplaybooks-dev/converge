import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

/// Pairing confirmation bottom sheet — shows beacon info and
/// confirm/cancel actions before adding a beacon to the tracking group.
class PairingConfirmation extends StatelessWidget {
  const PairingConfirmation({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppTheme.radiusLg),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Container(
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.brandBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              const SizedBox(height: AppTheme.spaceLg),

              // Title
              Text(
                'Xác nhận kết nối',
                style: textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppTheme.brandOnSurface,
                ),
              ),

              const SizedBox(height: AppTheme.spaceLg),

              // Beacon Info Card
              Container(
                padding: const EdgeInsets.all(AppTheme.spaceMd),
                decoration: BoxDecoration(
                  color: AppTheme.brandSurface,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppTheme.brandGreenLight,
                      ),
                      child: const Icon(
                        Icons.child_care,
                        color: AppTheme.brandGreen,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: AppTheme.spaceMd),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Beacon: Bé Na',
                            style: textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: AppTheme.brandOnSurface,
                            ),
                          ),
                          const SizedBox(height: AppTheme.spaceXs),
                          Text(
                            'UUID: ...E2C4 • Major: 100',
                            style: textTheme.bodySmall?.copyWith(
                              color: AppTheme.brandOnSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.spaceMd),

              // Warning Text
              Text(
                'Beacon sẽ được thêm vào nhóm theo dõi của bạn. Bạn có thể chia sẻ với người thân để cùng nhận thông báo.',
                style: textTheme.bodyMedium?.copyWith(
                  color: AppTheme.brandOnSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: AppTheme.spaceLg),

              // Confirm Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.brandOnSurface,
                    foregroundColor: colorScheme.surface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                  ),
                  child: const Text('Xác nhận'),
                ),
              ),

              const SizedBox(height: AppTheme.spaceSm),

              // Cancel Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context, false),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.brandOnSurface,
                    side: const BorderSide(color: AppTheme.brandBorder),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                  ),
                  child: const Text('Hủy'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}