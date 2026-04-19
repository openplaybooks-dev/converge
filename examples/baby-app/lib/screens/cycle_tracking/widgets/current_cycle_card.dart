import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class CurrentCycleCard extends StatelessWidget {
  const CurrentCycleCard({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        boxShadow: AppTheme.shadowStandard,
      ),
      padding: const EdgeInsets.all(AppTheme.screenHPadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Current Cycle',
            style: textTheme.titleLarge?.copyWith(
              color: AppTheme.textPrimaryColor,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppTheme.spaceMd),
          _statRow('Cycle Day', 'Day 18', AppTheme.textPrimaryColor, textTheme),
          _divider(),
          _statRow(
            'Cycle Length',
            '28 days',
            AppTheme.textPrimaryColor,
            textTheme,
          ),
          _divider(),
          _statRow('Next Period', 'Apr 29', AppTheme.coralColor, textTheme),
          _divider(),
          _statRow('Ovulation', 'Apr 16', AppTheme.lilacColor, textTheme),
        ],
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

  Widget _statRow(
    String label,
    String value,
    Color valueColor,
    TextTheme textTheme,
  ) {
    return Semantics(
      label: '$label: $value',
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: textTheme.bodySmall?.copyWith(
                color: AppTheme.textSecondaryColor,
              ),
            ),
            Text(
              value,
              style: textTheme.titleMedium?.copyWith(
                color: valueColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _divider() {
    return Container(
      height: 1,
      color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
    );
  }
}
