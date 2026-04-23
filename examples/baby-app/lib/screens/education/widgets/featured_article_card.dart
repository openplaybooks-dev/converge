import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_theme.dart';

class FeaturedArticleCard extends StatelessWidget {
  const FeaturedArticleCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Semantics(
      label:
          'Featured article: Nutrition in Your First Trimester, Nutrition',
      button: true,
      child: GestureDetector(
// @converge:element FeaturedArticleCard-onTap-1
        onTap: () => context.push('/education/article/:id'),
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
                // Illustration with breathing animation
                SizedBox(
                  height: 160,
                  child: Center(
                    child: Icon(
                      Icons.restaurant,
                      size: 80,
                      color: AppTheme.successColor.withValues(alpha: 0.3),
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
                  'Nutrition in Your First Trimester',
                  style: textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: AppTheme.chipBgColor,
                    borderRadius:
                        BorderRadius.circular(AppTheme.radiusFull),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
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
                const SizedBox(height: 6),
                Text(
                  'Essential nutrients and meal ideas to support healthy development during the early weeks of pregnancy.',
                  style: textTheme.bodySmall?.copyWith(
                    color: AppTheme.textSecondaryColor,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
