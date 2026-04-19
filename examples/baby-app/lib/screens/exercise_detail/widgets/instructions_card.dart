import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class InstructionsCard extends StatelessWidget {
  const InstructionsCard({super.key, required this.steps});

  final List<String> steps;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    return Semantics(
      label: 'Instructions',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          boxShadow: AppTheme.shadowStandard,
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.screenHPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Instructions',
                style: textTheme.headlineSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppTheme.screenHPadding),
              for (int i = 0; i < steps.length; i++) ...[
                if (i > 0) ...[
                  Padding(
                    padding: const EdgeInsets.only(left: 40),
                    child: Divider(
                      height: AppTheme.spaceMd,
                      thickness: 1,
                      color: colorScheme.onSurface.withValues(alpha: 0.06),
                    ),
                  ),
                ],
                Semantics(
                  label: 'Step ${i + 1}: ${steps[i]}',
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        margin: const EdgeInsets.only(top: 2),
                        decoration: const BoxDecoration(
                          color: AppTheme.lilacColor,
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '${i + 1}',
                          style: textTheme.bodySmall?.copyWith(
                            color: colorScheme.surface,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          steps[i],
                          style: textTheme.bodyLarge?.copyWith(
                            color: colorScheme.onSurface,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
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
}
