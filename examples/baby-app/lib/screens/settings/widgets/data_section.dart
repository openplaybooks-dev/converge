import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class DataSection extends StatelessWidget {
  const DataSection({super.key, required this.animationIndex});

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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: AppTheme.spaceMd),
              child: Text(
                'Data',
                style: textTheme.headlineSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),

            // Export Data Row
            Semantics(
              label: 'Export data',
              button: true,
              child: InkWell(
// @converge:element ExportData-onTap-1
                onTap: () => _exportData(context),
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Export Data',
                        style: textTheme.titleLarge?.copyWith(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Icon(
                        Icons.chevron_right,
                        size: 18,
                        color: AppTheme.textSecondaryColor,
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

            // Clear All Data Row
            Semantics(
              label: 'Clear all data, destructive action',
              button: true,
              child: InkWell(
// @converge:element ClearAllData-onTap-1
                onTap: () => _showClearDataDialog(context),
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Clear All Data',
                        style: textTheme.titleLarge?.copyWith(
                          color: AppTheme.errorColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Icon(
                        Icons.chevron_right,
                        size: 18,
                        color: AppTheme.errorColor,
                      ),
                    ],
                  ),
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

  void _exportData(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Exporting your data…')),
    );
  }

  void _showClearDataDialog(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surfaceColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        ),
        title: Text(
          'Clear All Data?',
          style: textTheme.headlineSmall?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Text(
          'This will permanently delete all your entries and preferences.',
          style: textTheme.bodyLarge?.copyWith(
            color: AppTheme.textSecondaryColor,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                side: BorderSide(
                  color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
                ),
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: 10,
              ),
            ),
            child: Text(
              'Cancel',
              style: textTheme.titleMedium?.copyWith(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: 10,
              ),
            ),
            child: Text(
              'Confirm',
              style: textTheme.titleMedium?.copyWith(
                color: AppTheme.surfaceColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
