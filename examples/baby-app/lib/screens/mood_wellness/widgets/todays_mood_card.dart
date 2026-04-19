import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';

class TodaysMoodCard extends StatefulWidget {
  const TodaysMoodCard({super.key});

  @override
  State<TodaysMoodCard> createState() => _TodaysMoodCardState();
}

class _TodaysMoodCardState extends State<TodaysMoodCard> {
  int _selectedMoodLevel = 5;

  static const _moodLabels = ['Very Low', 'Low', 'Neutral', 'Good', 'Great'];

  Color _moodLabelColor(int moodLevel) {
    if (moodLevel >= 4) return AppTheme.successColor;
    if (moodLevel == 3) return AppTheme.warningColor;
    return AppTheme.errorColor;
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Semantics(
      label: "Today's mood: Feeling Great",
      button: true,
      child: GestureDetector(
        onTap: () => debugPrint('Open mood logging'),
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
                  "Today's Mood",
                  style: textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppTheme.screenHPadding),

                // Mood icon row
                Semantics(
                  label: 'Mood level selector',
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: List.generate(5, (index) {
                      final level = index + 1;
                      final isSelected = level == _selectedMoodLevel;
                      return GestureDetector(
                        onTap: () =>
                            setState(() => _selectedMoodLevel = level),
                        child: Semantics(
                          label:
                              'Mood level $level: ${_moodLabels[index]}${isSelected ? ', selected' : ''}',
                          button: true,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppTheme.coralTintColor
                                  : null,
                              shape: BoxShape.circle,
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(6),
                              child: Column(
                                children: [
                                  Icon(
                                    level >= 4
                                        ? Icons.sentiment_satisfied_alt
                                        : Icons.sentiment_neutral,
                                    size: 28,
                                    color: isSelected
                                        ? AppTheme.coralColor
                                        : AppTheme.textSecondaryColor,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '$level',
                                    style: textTheme.labelSmall?.copyWith(
                                      color: isSelected
                                          ? AppTheme.coralColor
                                          : AppTheme.textSecondaryColor,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.04 * 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                const SizedBox(height: 12),

                // Mood status
                Center(
                  child: Column(
                    children: [
                      Text(
                        'Feeling ${_moodLabels[_selectedMoodLevel - 1]}',
                        style: textTheme.labelLarge?.copyWith(
                          color: _moodLabelColor(_selectedMoodLevel),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Had a wonderful morning walk and feeling energized for the day ahead.',
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurface,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Logged at 9:15 AM',
                        style: textTheme.bodySmall?.copyWith(
                          color: AppTheme.textSecondaryColor,
                        ),
                      ),
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
