import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

/// Emergency alert overlay — full-screen modal shown when a child beacon
/// is out of range. Uses pulsing warning icon, countdown timer, and
/// acknowledge button to prompt immediate caregiver action.
class Alert extends StatefulWidget {
  /// Remaining seconds before alarm triggers.
  final int secondsRemaining;

  /// Whether audio alert is active.
  final bool audioEnabled;

  /// Whether vibration is active.
  final bool vibrationEnabled;

  /// Called when the caregiver acknowledges the alert.
  final VoidCallback? onAcknowledge;

  const Alert({
    super.key,
    this.secondsRemaining = 32,
    this.audioEnabled = true,
    this.vibrationEnabled = true,
    this.onAcknowledge,
  });

  @override
  State<Alert> createState() => _AlertState();
}

class _AlertState extends State<Alert> with TickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final AnimationController _ringController;
  late final Animation<double> _pulseAnimation;
  late final Animation<double> _ringScaleAnimation;
  late final Animation<double> _ringOpacityAnimation;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);

    _ringController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _ringScaleAnimation = Tween<double>(begin: 1.0, end: 1.5).animate(
      CurvedAnimation(parent: _ringController, curve: Curves.easeOut),
    );

    _ringOpacityAnimation = Tween<double>(begin: 0.6, end: 0.0).animate(
      CurvedAnimation(parent: _ringController, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _ringController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    final alertColor = AppTheme.brandOnSurface;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceXl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Pulsing Alert Icon with ring
              SizedBox(
                width: 128,
                height: 128,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Concentric ring
                    AnimatedBuilder(
                      animation: _ringController,
                      builder: (context, child) {
                        return Transform.scale(
                          scale: _ringScaleAnimation.value,
                          child: Container(
                            width: 128,
                            height: 128,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: alertColor.withValues(
                                alpha: _ringOpacityAnimation.value,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                    // Pulsing icon
                    AnimatedBuilder(
                      animation: _pulseController,
                      builder: (context, child) {
                        return Transform.scale(
                          scale: _pulseAnimation.value,
                          child: Container(
                            width: 128,
                            height: 128,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: alertColor,
                              boxShadow: [
                                BoxShadow(
                                  color: colorScheme.onSurface.withValues(alpha: 0.2),
                                  blurRadius: 32,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Icon(
                              Icons.warning,
                              color: colorScheme.onPrimary,
                              size: 48,
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.spaceLg),

              // Status Text
              Column(
                children: [
                  Text(
                    'KHẨN CẤP',
                    style: textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: alertColor,
                    ),
                  ),
                  const SizedBox(height: AppTheme.spaceSm),
                  Text(
                    'Không thấy beacon',
                    style: textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: AppTheme.spaceXl),

              // Countdown Timer Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppTheme.spaceLg),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                ),
                child: Column(
                  children: [
                    Text(
                      'Thời gian còn lại',
                      style: textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.05,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppTheme.spaceSm),
                    Text(
                      '${widget.secondsRemaining}',
                      style: textTheme.displayLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: alertColor,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    const SizedBox(height: AppTheme.spaceSm),
                    Text(
                      'giây trước khi báo động',
                      style: textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.spaceLg),

              // Sound/Vibration Indicators
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _IndicatorChip(
                    icon: Icons.volume_up,
                    label: 'Âm thanh',
                    isActive: widget.audioEnabled,
                    colorScheme: colorScheme,
                    textTheme: textTheme,
                  ),
                  const SizedBox(width: AppTheme.spaceLg),
                  _IndicatorChip(
                    icon: Icons.vibration,
                    label: 'Rung',
                    isActive: widget.vibrationEnabled,
                    colorScheme: colorScheme,
                    textTheme: textTheme,
                  ),
                ],
              ),

              const SizedBox(height: AppTheme.spaceLg),

              // Acknowledge Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton.icon(
                  onPressed: widget.onAcknowledge,
                  icon: const Icon(Icons.check_circle),
                  label: const Text('Tôi đã kiểm tra'),
                  style: FilledButton.styleFrom(
                    backgroundColor: alertColor,
                    foregroundColor: colorScheme.onPrimary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IndicatorChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _IndicatorChip({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    final alertColor = AppTheme.brandOnSurface;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: alertColor,
          ),
          child: Icon(
            icon,
            color: colorScheme.onPrimary,
            size: 20,
          ),
        ),
        const SizedBox(width: AppTheme.spaceSm),
        Text(
          label,
          style: textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w500,
            color: colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}