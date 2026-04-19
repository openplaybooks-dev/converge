import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

/// Dialog overlay for confirming deletion of a health log entry.
///
/// Returns `true` via [Navigator.pop] if the user confirms deletion,
/// `false` if they cancel. Dismissed without action returns `null`.
class DeleteEntry extends StatelessWidget {
  const DeleteEntry({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Dialog(
      backgroundColor: colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
      ),
      insetPadding: const EdgeInsets.symmetric(
        horizontal: AppTheme.sectionSpacing,
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 320),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          boxShadow: AppTheme.shadowProminent,
        ),
        padding: const EdgeInsets.all(AppTheme.spaceLg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 9.1 Title
            Semantics(
              liveRegion: true,
              child: Text(
                'Delete Entry',
                style: textTheme.titleLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
              ),
            ),

            const SizedBox(height: AppTheme.cardSpacing),

            // 9.2 Body Text
            Text(
              'Are you sure you want to delete this entry? This action cannot be undone.',
              style: textTheme.bodyLarge?.copyWith(
                color: AppTheme.textSecondaryColor,
              ),
              maxLines: 3,
            ),

            const SizedBox(height: AppTheme.spaceLg),

            // 9.3 Action Row
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                // Cancel Button
                Semantics(
                  label: 'Cancel, keep entry',
                  button: true,
                  child: SizedBox(
                    height: 44,
                    child: TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      style: TextButton.styleFrom(
                        backgroundColor: AppTheme.chipBgColor,
                        foregroundColor: colorScheme.onSurface,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(
                            AppTheme.radiusFull,
                          ),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.spaceLg,
                        ),
                      ),
                      child: Text(
                        'Cancel',
                        style: textTheme.titleMedium?.copyWith(
                          color: colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: AppTheme.cardSpacing),

                // Delete Button
                Semantics(
                  label: 'Delete entry permanently',
                  button: true,
                  child: SizedBox(
                    height: 44,
                    child: TextButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: TextButton.styleFrom(
                        backgroundColor: AppTheme.errorColor,
                        foregroundColor: AppTheme.surfaceColor,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(
                            AppTheme.radiusFull,
                          ),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.spaceLg,
                        ),
                      ),
                      child: Text(
                        'Delete',
                        style: textTheme.titleMedium?.copyWith(
                          color: AppTheme.surfaceColor,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
