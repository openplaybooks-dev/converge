import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class QuickStatsRow extends StatelessWidget {
  const QuickStatsRow({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Semantics(
      label: 'Weight quick stats',
      child: Row(
        children: [
          Expanded(
            child: _quickStatCard(
              value: '58.3',
              unit: 'kg',
              label: 'Current',
              valueColor: AppTheme.coralColor,
              textTheme: textTheme,
              semanticsLabel: 'Current weight: 58.3 kilograms',
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _quickStatCard(
              value: '+0.4',
              unit: 'kg',
              label: 'This week',
              valueColor: AppTheme.successColor,
              textTheme: textTheme,
              semanticsLabel: 'Weekly change: plus 0.4 kilograms',
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _quickStatCard(
              value: '55\u201365',
              unit: 'kg',
              label: 'Target',
              valueColor: AppTheme.lilacColor,
              textTheme: textTheme,
              semanticsLabel: 'Target range: 55 to 65 kilograms',
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(
          delay: AppTheme.staggerDelay * 2,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: AppTheme.staggerDelay * 2,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }

  Widget _quickStatCard({
    required String value,
    required String unit,
    required String label,
    required Color valueColor,
    required TextTheme textTheme,
    required String semanticsLabel,
  }) {
    return Semantics(
      label: semanticsLabel,
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          boxShadow: AppTheme.shadowStandard,
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: value,
                    style: textTheme.headlineMedium?.copyWith(
                      color: valueColor,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  TextSpan(
                    text: unit,
                    style: textTheme.labelSmall?.copyWith(
                      color: AppTheme.textSecondaryColor,
                      fontWeight: FontWeight.w500,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label.toUpperCase(),
              style: textTheme.labelSmall?.copyWith(
                color: AppTheme.textSecondaryColor,
                fontWeight: FontWeight.w700,
                fontSize: 11,
                letterSpacing: 0.8,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
