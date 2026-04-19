import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class ProfileSection extends StatelessWidget {
  const ProfileSection({super.key, required this.animationIndex});

  final int animationIndex;

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
        child: Row(
          children: [
            // Avatar
            Semantics(
              label: 'Edit profile name',
              button: true,
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppTheme.coralTintColor,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppTheme.surfaceColor,
                    width: 2,
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: AppTheme.avatarShadowColor,
                      blurRadius: 8,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: Text(
                  'M',
                  style: textTheme.titleLarge?.copyWith(
                    color: AppTheme.coralColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppTheme.spaceMd),
            // Name + Due Date
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  label: 'Name: Mira',
                  child: Text(
                    'Mira',
                    style: textTheme.titleLarge?.copyWith(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 2),
                Semantics(
                  label: 'Due date: 15 August 2026, tap to change',
                  child: Text(
                    'Due: 15 Aug 2026',
                    style: textTheme.labelLarge?.copyWith(
                      color: AppTheme.textSecondaryColor,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
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
