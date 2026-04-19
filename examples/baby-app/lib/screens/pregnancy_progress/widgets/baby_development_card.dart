import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class BabyDevelopmentCard extends StatelessWidget {
  const BabyDevelopmentCard({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    const milestones = [
      (Icons.hearing, 'Hearing is developing \u2014 baby can now hear your heartbeat, your voice, and external sounds. Try talking or reading aloud.'),
      (Icons.restaurant, 'Taste buds are forming. Your baby is beginning to taste what you eat through the amniotic fluid.'),
      (Icons.show_chart, 'Kicks and rolls are becoming more noticeable as muscles grow stronger. You may feel regular movement patterns.'),
      (Icons.scale, 'Baby weighs approximately 430g and is about 27cm long from head to heel.'),
    ];

    return Semantics(
      label: 'Baby development milestones this week',
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
              children: [
                const Icon(
                  Icons.child_care,
                  size: 22,
                  color: AppTheme.lilacColor,
                ),
                const SizedBox(width: AppTheme.spaceSm),
                Text(
                  'Baby Development',
                  style: textTheme.headlineSmall?.copyWith(
                    color: AppTheme.textPrimaryColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppTheme.spaceSm),
            for (var i = 0; i < milestones.length; i++) ...[
              if (i > 0) _divider(),
              _buildMilestoneItem(
                milestones[i].$1,
                milestones[i].$2,
                textTheme,
              ),
            ],
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

  Widget _buildMilestoneItem(
    IconData icon,
    String text,
    TextTheme textTheme,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceSm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppTheme.lilacTintColor,
              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            ),
            child: Icon(icon, size: 16, color: AppTheme.lilacColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                text,
                style: textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textPrimaryColor,
                  height: 1.5,
                ),
              ),
            ),
          ),
        ],
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
