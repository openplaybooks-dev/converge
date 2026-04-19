import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class DoctorVisitCard extends StatelessWidget {
  const DoctorVisitCard({
    super.key,
    required this.visit,
    this.animationIndex = 0,
  });

  final DoctorVisit visit;
  final int animationIndex;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Semantics(
      label: 'Doctor visit on ${visit.date}: ${visit.summary}',
      button: true,
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
                visit.date,
                style: textTheme.bodySmall?.copyWith(
                  color: AppTheme.textSecondaryColor,
                  fontWeight: FontWeight.w400,
                ),
              ),
              if (visit.doctorName != null) ...[
                const SizedBox(height: 6),
                Text(
                  visit.doctorName!,
                  style: textTheme.labelLarge?.copyWith(
                    color: AppTheme.lilacColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
              const SizedBox(height: 6),
              Text(
                visit.summary,
                style: textTheme.titleMedium?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (visit.notes != null) ...[
                const SizedBox(height: 6),
                Text(
                  visit.notes!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurface,
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
          delay: AppTheme.staggerDelay * animationIndex,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: AppTheme.staggerDelay * animationIndex,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }
}

class DoctorVisit {
  const DoctorVisit({
    required this.date,
    this.doctorName,
    required this.summary,
    this.notes,
  });

  final String date;
  final String? doctorName;
  final String summary;
  final String? notes;
}
