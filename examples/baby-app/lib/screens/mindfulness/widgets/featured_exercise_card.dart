import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_theme.dart';

class FeaturedExerciseCard extends StatelessWidget {
  const FeaturedExerciseCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Semantics(
      label: 'Featured exercise: Deep Breathing, Breathing, 5 min',
      button: true,
      child: GestureDetector(
// @converge:element FeaturedExerciseCard-onTap-1
        onTap: () => context.push('/mindfulness/exercise/deep-breathing'),
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
                // Illustration placeholder
                SizedBox(
                  height: 160,
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
                const SizedBox(height: AppTheme.spaceMd),
                Text(
                  'Deep Breathing',
                  style: textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                DecoratedBox(
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
                      'BREATHING',
                      style: textTheme.labelSmall?.copyWith(
                        color: AppTheme.lilacColor,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.04 * 11,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '5 min',
                  style: textTheme.labelLarge?.copyWith(
                    color: AppTheme.textSecondaryColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
