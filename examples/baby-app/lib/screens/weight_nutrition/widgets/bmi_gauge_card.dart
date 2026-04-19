import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class BmiGaugeCard extends StatelessWidget {
  const BmiGaugeCard({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Semantics(
      label: 'BMI gauge showing 22.4, category: Healthy',
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          boxShadow: AppTheme.shadowStandard,
        ),
        padding: const EdgeInsets.all(AppTheme.screenHPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'BMI',
                  style: textTheme.titleLarge?.copyWith(
                    color: AppTheme.textPrimaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '22.4',
                  style: textTheme.headlineMedium?.copyWith(
                    color: AppTheme.lilacColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildBmiGauge(),
            const SizedBox(height: AppTheme.spaceSm),
            _buildBmiThresholdLabels(textTheme),
            const SizedBox(height: AppTheme.spaceMd),
            _divider(),
            const SizedBox(height: AppTheme.spaceSm),
            _buildHeightRow(textTheme),
            const SizedBox(height: AppTheme.spaceSm),
            Text(
              'Healthy',
              style: textTheme.bodySmall?.copyWith(
                color: AppTheme.successColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(
          delay: AppTheme.staggerDelay,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: AppTheme.staggerDelay,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }

  Widget _buildBmiGauge() {
    const gaugeSegments = [
      AppTheme.bmiUnderweightColor,
      AppTheme.bmiHealthyColor,
      AppTheme.bmiCautionColor,
      AppTheme.bmiWarningColor,
      AppTheme.bmiAlertColor,
    ];
    const segmentLabels = [
      'Underweight range: below 18.5',
      'Healthy range: 18.5 to 25',
      'Caution range: 25 to 30',
      'Warning range: 30 to 35',
      'Alert range: above 35',
    ];

    return SizedBox(
      height: 44,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            left: 0,
            right: 0,
            top: 14,
            height: 18,
            child: Row(
              children: List.generate(gaugeSegments.length, (i) {
                return Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      right: i < gaugeSegments.length - 1 ? 4 : 0,
                    ),
                    child: Semantics(
                      label: segmentLabels[i],
                      child: Container(
                        decoration: BoxDecoration(
                          color: gaugeSegments[i],
                          borderRadius: BorderRadius.circular(
                            AppTheme.radiusFull,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          // Needle at ~35% for BMI 22.4
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            child: LayoutBuilder(
              builder: (context, constraints) {
                // BMI 22.4 in range 16..40 → 35%
                const needlePercent = 0.35;
                final needleX =
                    constraints.maxWidth * needlePercent;
                return Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned(
                      left: needleX - 1,
                      top: 6,
                      child: Container(
                        width: 2,
                        height: 34,
                        decoration: BoxDecoration(
                          color: AppTheme.textPrimaryColor,
                          borderRadius: BorderRadius.circular(1),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBmiThresholdLabels(TextTheme textTheme) {
    const labels = ['16', '18.5', '25', '30', '35', '40'];
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: labels
          .map(
            (l) => Text(
              l,
              style: textTheme.labelSmall?.copyWith(
                color: AppTheme.textSecondaryColor,
                fontWeight: FontWeight.w700,
                fontSize: 11,
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildHeightRow(TextTheme textTheme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Height',
          style: textTheme.bodySmall?.copyWith(
            color: AppTheme.textSecondaryColor,
          ),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '161 cm',
              style: textTheme.bodyMedium?.copyWith(
                color: AppTheme.textPrimaryColor,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: AppTheme.spaceSm),
            const Icon(
              Icons.edit_outlined,
              size: 18,
              color: AppTheme.textSecondaryColor,
            ),
          ],
        ),
      ],
    );
  }

  Widget _divider() {
    return Container(
      height: 1,
      color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
    );
  }
}
