import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/app_theme.dart';

class SelfCareCard extends StatelessWidget {
  const SelfCareCard({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    const items = [
      ('Drink 8 glasses of water', true),
      ('Take prenatal vitamins', true),
      ('Kegel exercises', true),
      ('10 min stretching', false),
      ('Rest and relax', false),
    ];

    final completedCount = items.where((i) => i.$2).length;

    return Semantics(
      label: 'Self-care checklist, $completedCount of ${items.length} complete',
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
                  'Self-Care',
                  style: textTheme.headlineSmall?.copyWith(
                    color: AppTheme.textPrimaryColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  '$completedCount/${items.length} complete',
                  style: textTheme.labelLarge?.copyWith(
                    color: AppTheme.textSecondaryColor,
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppTheme.spaceSm),
            for (var i = 0; i < items.length; i++) ...[
              if (i > 0) _divider(),
              _buildChecklistItem(
                items[i].$1,
                items[i].$2,
                textTheme,
              ),
            ],
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(
          delay: AppTheme.staggerDelay * 2,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: AppTheme.staggerDelay * 2,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }

  Widget _buildChecklistItem(
    String title,
    bool isCompleted,
    TextTheme textTheme,
  ) {
    return Semantics(
      label: '$title, ${isCompleted ? 'completed' : 'not completed'}',
      toggled: isCompleted,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: isCompleted
                    ? AppTheme.successColor
                    : AppTheme.surfaceColor,
                borderRadius: BorderRadius.circular(6),
                border: isCompleted
                    ? null
                    : Border.all(
                        color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
                        width: 2,
                      ),
              ),
              child: isCompleted
                  ? const Icon(
                      Icons.check,
                      size: 14,
                      color: AppTheme.surfaceColor,
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Opacity(
                opacity: isCompleted ? 0.6 : 1.0,
                child: Text(
                  title,
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textPrimaryColor,
                  ),
                ),
              ),
            ),
          ],
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
