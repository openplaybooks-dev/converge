import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class NutritionTipsCard extends StatelessWidget {
  const NutritionTipsCard({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Semantics(
      label: 'Nutrition tips for week 22',
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
            Text(
              'Nutrition Tips \u2014 Week 22',
              style: textTheme.titleLarge?.copyWith(
                color: AppTheme.textPrimaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            _nutritionTip(
              icon: Icons.eco_outlined,
              text:
                  'Increase iron-rich foods like leafy greens and lentils to support growing blood volume',
              textTheme: textTheme,
              semanticsLabel:
                  'Nutrition tip: Increase iron-rich foods',
            ),
            _divider(),
            _nutritionTip(
              icon: Icons.water_drop_outlined,
              text:
                  'Stay hydrated with at least 2.3 litres of water daily for amniotic fluid balance',
              textTheme: textTheme,
              semanticsLabel: 'Nutrition tip: Stay hydrated',
            ),
            _divider(),
            _nutritionTip(
              icon: Icons.psychology_outlined,
              text:
                  'Include omega-3 sources like walnuts or chia seeds for baby\u2019s brain development',
              textTheme: textTheme,
              semanticsLabel:
                  'Nutrition tip: Include omega-3 sources',
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(
          delay: AppTheme.staggerDelay * 3,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: AppTheme.staggerDelay * 3,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }

  Widget _nutritionTip({
    required IconData icon,
    required String text,
    required TextTheme textTheme,
    required String semanticsLabel,
  }) {
    return Semantics(
      label: semanticsLabel,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceSm),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              size: 20,
              color: AppTheme.lilacColor,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                text,
                style: textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textSecondaryColor,
                  fontWeight: FontWeight.w500,
                  height: 1.5,
                ),
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
