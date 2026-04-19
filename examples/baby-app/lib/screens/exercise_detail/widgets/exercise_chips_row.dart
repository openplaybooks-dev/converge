import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class ExerciseChipsRow extends StatelessWidget {
  const ExerciseChipsRow({
    super.key,
    required this.duration,
    required this.difficulty,
  });

  final String duration;
  final String difficulty;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        Semantics(
          label: 'Duration: $duration',
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: AppTheme.chipBgColor,
              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.screenHPadding,
                vertical: AppTheme.spaceSm,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.access_time,
                    size: 16,
                    color: AppTheme.lilacColor,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    duration,
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
        const SizedBox(width: 8),
        Semantics(
          label: 'Difficulty: $difficulty',
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: AppTheme.chipBgColor,
              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.screenHPadding,
                vertical: AppTheme.spaceSm,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.signal_cellular_alt,
                    size: 16,
                    color: AppTheme.lilacColor,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    difficulty,
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
      ],
    )
        .animate()
        .fadeIn(
          delay: AppTheme.staggerDelay * 2,
          duration: const Duration(milliseconds: 300),
          curve: AppTheme.springCurve,
        );
  }
}
