import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class PregnancySection extends StatelessWidget {
  const PregnancySection({
    super.key,
    required this.animationIndex,
    this.onEditDueDate,
  });

  final int animationIndex;
  final VoidCallback? onEditDueDate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        boxShadow: AppTheme.shadowStandard,
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.screenHPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: AppTheme.spaceMd),
              child: Text(
                'Pregnancy',
                style: textTheme.headlineSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),

            // Due Date Row
            Semantics(
              label: 'Due date: 15 August 2026, tap to change',
              button: true,
              child: InkWell(
                onTap: onEditDueDate,
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Due Date',
                        style: textTheme.titleLarge?.copyWith(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '15 Aug 2026',
                            style: textTheme.labelLarge?.copyWith(
                              color: AppTheme.textSecondaryColor,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: AppTheme.spaceSm),
                          const Icon(
                            Icons.chevron_right,
                            size: 18,
                            color: AppTheme.textSecondaryColor,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

            Container(
              height: 1,
              color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
            ),

            // Trimester Display Row
            Semantics(
              label: 'Current trimester: 2',
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Current Trimester',
                      style: textTheme.titleLarge?.copyWith(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.chipBgColor,
                        borderRadius:
                            BorderRadius.circular(AppTheme.radiusFull),
                      ),
                      child: Text(
                        '2ND',
                        style: textTheme.labelSmall?.copyWith(
                          color: AppTheme.lilacColor,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
          delay: AppTheme.staggerDelay * animationIndex,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
          delay: AppTheme.staggerDelay * animationIndex,
        );
  }
}
