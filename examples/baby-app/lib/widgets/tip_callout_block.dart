import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class TipCalloutBlock extends StatelessWidget {
  const TipCalloutBlock({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppTheme.surfaceTertiaryColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd + 4),
        border: Border(
          left: BorderSide(
            color: AppTheme.lilacColor,
            width: 3,
          ),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.screenHPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tip',
              style: textTheme.labelLarge?.copyWith(
                color: AppTheme.lilacColor,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'If morning sickness makes eating difficult, try smaller meals spread throughout the day rather than three large ones.',
              style: textTheme.bodyLarge?.copyWith(
                color: colorScheme.onSurface,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
