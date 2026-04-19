import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class DisplaySection extends StatefulWidget {
  const DisplaySection({super.key, required this.animationIndex});

  final int animationIndex;

  @override
  State<DisplaySection> createState() => _DisplaySectionState();
}

class _DisplaySectionState extends State<DisplaySection> {
  bool _reducedMotion = false;
  bool _useKg = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        boxShadow: AppTheme.shadowStandard,
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.screenHPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: AppTheme.spaceMd),
              child: Text(
                'Display',
                style: textTheme.headlineSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            _buildToggleRow(
              textTheme: textTheme,
              colorScheme: colorScheme,
              label: 'Reduced Motion',
              value: _reducedMotion,
              onChanged: (v) => setState(() => _reducedMotion = v),
            ),
            Container(
              height: 1,
              color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
            ),

            // Weight Units Segmented Control
            Semantics(
              label: 'Weight units: ${_useKg ? 'kilograms' : 'pounds'}',
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Weight Units',
                      style: textTheme.titleLarge?.copyWith(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        borderRadius:
                            BorderRadius.circular(AppTheme.radiusFull),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          GestureDetector(
                            onTap: () => setState(() => _useKg = true),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 6,
                              ),
                              constraints: const BoxConstraints(
                                minHeight: 36,
                              ),
                              decoration: BoxDecoration(
                                color: _useKg
                                    ? AppTheme.lilacTintColor
                                    : AppTheme.chipBgColor,
                                borderRadius: BorderRadius.circular(
                                  AppTheme.radiusFull,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'kg',
                                style: textTheme.labelLarge?.copyWith(
                                  color: _useKg
                                      ? AppTheme.lilacColor
                                      : AppTheme.textSecondaryColor,
                                  fontWeight: _useKg
                                      ? FontWeight.w600
                                      : FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: () => setState(() => _useKg = false),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 6,
                              ),
                              constraints: const BoxConstraints(
                                minHeight: 36,
                              ),
                              decoration: BoxDecoration(
                                color: _useKg
                                    ? AppTheme.chipBgColor
                                    : AppTheme.lilacTintColor,
                                borderRadius: BorderRadius.circular(
                                  AppTheme.radiusFull,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'lbs',
                                style: textTheme.labelLarge?.copyWith(
                                  color: _useKg
                                      ? AppTheme.textSecondaryColor
                                      : AppTheme.lilacColor,
                                  fontWeight: _useKg
                                      ? FontWeight.w500
                                      : FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
          delay: AppTheme.staggerDelay * widget.animationIndex,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
          delay: AppTheme.staggerDelay * widget.animationIndex,
        );
  }

  Widget _buildToggleRow({
    required TextTheme textTheme,
    required ColorScheme colorScheme,
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Semantics(
      label: '$label, ${value ? 'on' : 'off'}',
      toggled: value,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: textTheme.titleLarge?.copyWith(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(
              width: 52,
              height: 30,
              child: Switch(
                value: value,
                onChanged: onChanged,
                activeThumbColor: AppTheme.surfaceColor,
                activeTrackColor: AppTheme.lilacColor,
                inactiveThumbColor: AppTheme.surfaceColor,
                inactiveTrackColor: AppTheme.chipBgColor,
                trackOutlineColor: WidgetStateProperty.all(
                  AppTheme.chipBgColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
