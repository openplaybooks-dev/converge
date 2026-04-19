import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class WeightHistorySection extends StatelessWidget {
  const WeightHistorySection({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Entries',
          style: textTheme.titleLarge?.copyWith(
            color: AppTheme.textPrimaryColor,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.surfaceColor,
            borderRadius: BorderRadius.circular(AppTheme.radiusCard),
            boxShadow: AppTheme.shadowStandard,
          ),
          padding: const EdgeInsets.all(AppTheme.screenHPadding),
          child: Column(
            children: [
              _weightHistoryItem(
                date: '17 Apr',
                weight: '58.3',
                textTheme: textTheme,
                semanticsLabel:
                    'Weight entry on April 17: 58.3 kilograms',
              ),
              _divider(),
              _weightHistoryItem(
                date: '14 Apr',
                weight: '57.9',
                textTheme: textTheme,
                semanticsLabel:
                    'Weight entry on April 14: 57.9 kilograms',
              ),
              _divider(),
              _weightHistoryItem(
                date: '10 Apr',
                weight: '57.6',
                textTheme: textTheme,
                semanticsLabel:
                    'Weight entry on April 10: 57.6 kilograms',
              ),
              _divider(),
              _weightHistoryItem(
                date: '7 Apr',
                weight: '57.2',
                textTheme: textTheme,
                semanticsLabel:
                    'Weight entry on April 7: 57.2 kilograms',
              ),
            ],
          ),
        ),
      ],
    )
        .animate()
        .fadeIn(
          delay: AppTheme.staggerDelay * 4,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: AppTheme.staggerDelay * 4,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }

  Widget _weightHistoryItem({
    required String date,
    required String weight,
    required TextTheme textTheme,
    required String semanticsLabel,
  }) {
    return Semantics(
      label: semanticsLabel,
      button: true,
      child: InkWell(
        onTap: () => debugPrint('View weight entry: $date $weight kg'),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                date,
                style: textTheme.bodySmall?.copyWith(
                  color: AppTheme.textSecondaryColor,
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: '$weight ',
                          style: textTheme.titleMedium?.copyWith(
                            color: AppTheme.textPrimaryColor,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        TextSpan(
                          text: 'kg',
                          style: textTheme.bodyMedium?.copyWith(
                            color: AppTheme.textSecondaryColor,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
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
    );
  }

  Widget _divider() {
    return Container(
      height: 1,
      color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
    );
  }
}
