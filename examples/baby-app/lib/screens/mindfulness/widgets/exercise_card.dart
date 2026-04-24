import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import 'package:folio/theme/app_theme.dart';

class ExerciseCard extends StatelessWidget {
  const ExerciseCard({
    super.key,
    required this.name,
    required this.category,
    required this.duration,
    required this.index,
  });

  final String name;
  final String category;
  final String duration;
  final int index;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Semantics(
      label: '$name, $category, $duration',
      button: true,
      child: GestureDetector(
// @converge:element ExerciseCard-onTap-1
        onTap: () => context.push('/mindfulness/exercise/${name.toLowerCase().replaceAll(' ', '-')}'),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(AppTheme.radiusCard),
            boxShadow: AppTheme.shadowStandard,
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.screenHPadding),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  _iconForCategory(category),
                  size: 48,
                  color: _colorForCategory(category)
                      .withValues(alpha: 0.3),
                ),
                const SizedBox(height: 10),
                Text(
                  name,
                  style: textTheme.titleMedium?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 2),
                Text(
                  category,
                  style: textTheme.bodySmall?.copyWith(
                    color: AppTheme.textSecondaryColor,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.access_time,
                      size: 16,
                      color: AppTheme.lilacColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      duration,
                      style: textTheme.labelLarge?.copyWith(
                        color: AppTheme.textSecondaryColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(
          delay: AppTheme.staggerDelay * (index + 1),
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: AppTheme.staggerDelay * (index + 1),
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }

  static IconData _iconForCategory(String category) {
    switch (category) {
      case 'Breathing':
        return Icons.air;
      case 'Stretching':
        return Icons.accessibility_new;
      case 'Meditation':
        return Icons.self_improvement;
      default:
        return Icons.self_improvement;
    }
  }

  static Color _colorForCategory(String category) {
    switch (category) {
      case 'Stretching':
        return AppTheme.coralColor;
      default:
        return AppTheme.lilacColor;
    }
  }
}
