import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';

class MoodHistoryEntryData {
  const MoodHistoryEntryData({
    required this.mood,
    required this.energy,
    required this.date,
    required this.notes,
    required this.moodLevel,
  });

  final String mood;
  final String energy;
  final String date;
  final String? notes;
  final int moodLevel;
}

class MoodHistoryEntry extends StatelessWidget {
  const MoodHistoryEntry({super.key, required this.entry});

  final MoodHistoryEntryData entry;

  Color _moodDotColor(int moodLevel) {
    if (moodLevel >= 4) return AppTheme.successColor;
    if (moodLevel == 3) return AppTheme.warningColor;
    return AppTheme.errorColor;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    return Semantics(
      label:
          'Mood entry on ${entry.date}: ${entry.mood}, ${entry.energy}',
      button: true,
      child: GestureDetector(
        onTap: () => debugPrint('View mood entry: ${entry.date}'),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(AppTheme.radiusCard),
            boxShadow: AppTheme.shadowStandard,
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.screenHPadding),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Mood dot
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: _moodDotColor(entry.moodLevel),
                      shape: BoxShape.circle,
                    ),
                    child: const SizedBox(width: 12, height: 12),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.mood,
                        style: textTheme.titleMedium?.copyWith(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        entry.energy,
                        style: textTheme.labelLarge?.copyWith(
                          color: AppTheme.textSecondaryColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        entry.date,
                        style: textTheme.bodySmall?.copyWith(
                          color: AppTheme.textSecondaryColor,
                        ),
                      ),
                      if (entry.notes != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          entry.notes!,
                          style: textTheme.bodyMedium?.copyWith(
                            color: colorScheme.onSurface,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
