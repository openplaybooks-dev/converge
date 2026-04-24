import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

/// Test alert countdown overlay — bottom sheet shown when user
/// initiates a test alert from the home screen. Displays countdown
/// before the test alert fires.
class TestAlert extends StatelessWidget {
  /// Current countdown value in seconds.
  final int countdownSeconds;

  /// Whether the countdown is actively running.
  final bool isRunning;

  /// Called when the user taps "Bắt đầu kiểm tra".
  final VoidCallback? onStart;

  /// Called when the user taps "Hủy".
  final VoidCallback? onCancel;

  const TestAlert({
    super.key,
    this.countdownSeconds = 10,
    this.isRunning = false,
    this.onStart,
    this.onCancel,
  });

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
          padding: const EdgeInsets.all(AppTheme.spaceMd),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 32,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.brandBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: AppTheme.spaceLg),

              // Title
              Text(
                'Kiểm tra cảnh báo',
                style: textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppTheme.brandOnSurface,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppTheme.spaceSm),

              // Subtitle
              Text(
                'Cảnh báo sẽ phát sau khoảng thời gian đã chọn',
                style: textTheme.bodyMedium?.copyWith(
                  color: AppTheme.brandOnSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppTheme.spaceLg),

              // Countdown Circle
              Center(
                child: SizedBox(
                  width: 128,
                  height: 128,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Background ring
                      Container(
                        width: 128,
                        height: 128,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppTheme.brandBorder,
                            width: 4,
                          ),
                        ),
                      ),
                      // Foreground ring (brand color)
                      Container(
                        width: 128,
                        height: 128,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppTheme.brandGreen,
                            width: 4,
                          ),
                        ),
                      ),
                      // Countdown number
                      Text(
                        '$countdownSeconds',
                        style: textTheme.displayMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppTheme.brandGreen,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppTheme.spaceLg),

              // Status text
              Text(
                isRunning
                    ? 'Đang đếm ngược...'
                    : 'Nhấn nút bên dưới để bắt đầu đếm ngược',
                style: textTheme.bodyMedium?.copyWith(
                  color: AppTheme.brandOnSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppTheme.spaceLg),

              // Start button
              SizedBox(
                height: 56,
                child: FilledButton.icon(
                  onPressed: onStart,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Bắt đầu kiểm tra'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.brandGreen,
                    foregroundColor: colorScheme.onPrimary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppTheme.spaceMd),

              // Cancel button
              SizedBox(
                height: 56,
                child: FilledButton(
                  onPressed: onCancel,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.brandSurfaceContainer,
                    foregroundColor: AppTheme.brandOnSurface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                  ),
                  child: const Text('Hủy'),
                ),
              ),
              const SizedBox(height: AppTheme.spaceMd),
            ],
          ),
        ),
      ),
    );
  }
}