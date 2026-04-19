import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class ExerciseHeroCard extends StatelessWidget {
  const ExerciseHeroCard({
    super.key,
    required this.exerciseName,
    required this.category,
  });

  final String exerciseName;
  final String category;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    return Semantics(
      label: 'Illustration for $exerciseName',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusHero),
          boxShadow: AppTheme.shadowProminent,
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceXl),
          child: Column(
            children: [
              // Illustration placeholder with breathing animation
              FractionallySizedBox(
                widthFactor: 0.7,
                child: AspectRatio(
                  aspectRatio: 1,
                  child: Center(
                    child: Icon(
                      Icons.self_improvement,
                      size: 80,
                      color: AppTheme.lilacColor.withValues(alpha: 0.3),
                    ),
                  ),
                )
                    .animate(
                      onPlay: (controller) => controller.repeat(),
                    )
                    .scale(
                      begin: const Offset(1.0, 1.0),
                      end: const Offset(1.015, 1.015),
                      duration: const Duration(seconds: 2),
                      curve: Curves.easeInOut,
                    )
                    .then()
                    .scale(
                      begin: const Offset(1.015, 1.015),
                      end: const Offset(1.0, 1.0),
                      duration: const Duration(seconds: 2),
                      curve: Curves.easeInOut,
                    ),
              ),
              const SizedBox(height: AppTheme.spaceMd),
              Text(
                exerciseName,
                style: textTheme.headlineSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Semantics(
                label: 'Category: $category',
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: AppTheme.chipBgColor,
                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    child: Text(
                      category.toUpperCase(),
                      style: textTheme.labelSmall?.copyWith(
                        color: AppTheme.lilacColor,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.04 * 11,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }
}
