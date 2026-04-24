import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_theme.dart';

class ExerciseGuideCard extends StatelessWidget {
  const ExerciseGuideCard({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    const exercises = [
      (Icons.directions_walk, 'Walking', 'Low-impact cardio that supports circulation'),
      (Icons.pool, 'Swimming', 'Full-body workout with reduced joint strain'),
      (Icons.self_improvement, 'Prenatal Yoga', 'Gentle stretching and breathing for flexibility'),
      (Icons.replay, 'Pelvic Tilts', 'Strengthens core and eases lower back tension'),
    ];

    return Semantics(
      label: 'Safe exercises for trimester 2',
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
                  'Safe Exercises',
                  style: textTheme.headlineSmall?.copyWith(
                    color: AppTheme.textPrimaryColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  'For Trimester 2',
                  style: textTheme.labelLarge?.copyWith(
                    color: AppTheme.textSecondaryColor,
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppTheme.spaceSm),
            for (var i = 0; i < exercises.length; i++) ...[
              if (i > 0) _divider(),
              _buildExerciseItem(
                context,
                exercises[i].$1,
                exercises[i].$2,
                exercises[i].$3,
                textTheme,
              ),
            ],
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

  Widget _buildExerciseItem(
    BuildContext context,
    IconData icon,
    String name,
    String description,
    TextTheme textTheme,
  ) {
    return Semantics(
      label: '$name: $description',
      button: true,
      child: InkWell(
// @converge:element ExerciseGuideItem-onTap-1
        onTap: () => context.push('/mindfulness'),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: AppTheme.lilacTintColor,
                  borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                ),
                child: Icon(icon, size: 20, color: AppTheme.lilacColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: textTheme.titleMedium?.copyWith(
                        color: AppTheme.textPrimaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      description,
                      style: textTheme.bodySmall?.copyWith(
                        color: AppTheme.textSecondaryColor,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right,
                size: 18,
                color: AppTheme.textSecondaryColor,
              ),
            ],
          ),
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
