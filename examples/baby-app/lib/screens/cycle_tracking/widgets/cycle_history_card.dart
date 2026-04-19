import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class CycleHistoryCard extends StatelessWidget {
  const CycleHistoryCard({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        boxShadow: AppTheme.shadowStandard,
      ),
      padding: const EdgeInsets.all(AppTheme.screenHPadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'History',
            style: textTheme.titleLarge?.copyWith(
              color: AppTheme.textPrimaryColor,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppTheme.spaceMd),
          _historyItem(
            'Mar 4 – Mar 8',
            '28 days',
            false,
            textTheme,
          ),
          _divider(),
          _historyItem(
            'Feb 1 – Feb 6',
            '32 days',
            true,
            textTheme,
          ),
          _divider(),
          _historyItem(
            'Jan 1 – Jan 5',
            '27 days',
            false,
            textTheme,
          ),
          _divider(),
          _historyItem(
            'Dec 5 – Dec 9',
            '28 days',
            false,
            textTheme,
          ),
        ],
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

  Widget _divider() {
    return Container(
      height: 1,
      color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
    );
  }

  Widget _historyItem(
    String dateRange,
    String duration,
    bool isIrregular,
    TextTheme textTheme,
  ) {
    return Semantics(
      label:
          'Cycle from $dateRange, $duration, ${isIrregular ? "irregular" : "regular"}',
      child: InkWell(
        onTap: () => debugPrint('View cycle: $dateRange'),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dateRange,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppTheme.textPrimaryColor,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    duration,
                    style: textTheme.labelSmall?.copyWith(
                      color: AppTheme.textSecondaryColor,
                      fontWeight: FontWeight.w400,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isIrregular)
                    Semantics(
                      label: 'Irregular cycle',
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.spaceSm,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.warningColor.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(
                            AppTheme.radiusFull,
                          ),
                        ),
                        child: Text(
                          'Irregular',
                          style: textTheme.labelSmall?.copyWith(
                            color: AppTheme.warningColor,
                            fontWeight: FontWeight.w500,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  if (isIrregular) const SizedBox(width: AppTheme.spaceSm),
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
    );
  }
}
