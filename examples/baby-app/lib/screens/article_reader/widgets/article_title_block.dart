import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class ArticleTitleBlock extends StatelessWidget {
  const ArticleTitleBlock({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Semantics(
      label: 'Article details',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(
              'Nutrition in Your First Trimester',
              style: textTheme.displaySmall?.copyWith(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w800,
                height: 1.15,
                letterSpacing: -0.02 * 32,
              ),
            ),
          ),
          const SizedBox(height: AppTheme.spaceSm),
          Row(
            children: [
              Semantics(
                label: 'Topic: Nutrition',
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: AppTheme.chipBgColor,
                    borderRadius:
                        BorderRadius.circular(AppTheme.radiusFull),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppTheme.spaceMd,
                      vertical: AppTheme.spaceSm,
                    ),
                    child: Text(
                      'NUTRITION',
                      style: textTheme.labelSmall?.copyWith(
                        color: AppTheme.lilacColor,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.04 * 11,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppTheme.spaceSm + 4),
              Semantics(
                label: '5 minute read',
                child: Row(
                  children: [
                    const Icon(
                      Icons.access_time,
                      size: 14,
                      color: AppTheme.textSecondaryColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '5 min read',
                      style: textTheme.labelLarge?.copyWith(
                        color: AppTheme.textSecondaryColor,
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(
          delay: const Duration(milliseconds: 80),
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
  }
}
