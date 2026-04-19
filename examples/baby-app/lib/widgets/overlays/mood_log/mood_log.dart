import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

/// Bottom-sheet overlay for logging mood, energy level, and an optional note.
///
/// Returns a [Map] with keys `moodLevel` (int 1-5), `energyLevel` (int 1-5),
/// and optionally `notes` (String) via [Navigator.pop], or `null`
/// if dismissed without saving.
class MoodLog extends StatefulWidget {
  const MoodLog({super.key});

  @override
  State<MoodLog> createState() => _MoodLogState();
}

class _MoodLogState extends State<MoodLog> {
  int? _selectedMood;
  double _energyLevel = 3;
  final _notesController = TextEditingController();

  static const _moodOptions = [
    (icon: Icons.sentiment_very_dissatisfied, label: 'Awful'),
    (icon: Icons.sentiment_dissatisfied, label: 'Bad'),
    (icon: Icons.sentiment_neutral, label: 'Okay'),
    (icon: Icons.sentiment_satisfied, label: 'Good'),
    (icon: Icons.sentiment_very_satisfied, label: 'Great'),
  ];

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  void _save() {
    if (_selectedMood == null) return;
    Navigator.pop(context, {
      'moodLevel': _selectedMood,
      'energyLevel': _energyLevel.round(),
      'notes': _notesController.text.isEmpty ? null : _notesController.text,
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.only(bottom: AppTheme.spaceLg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              Padding(
                padding: const EdgeInsets.only(
                  left: AppTheme.screenHPadding,
                  right: AppTheme.screenHPadding,
                  top: AppTheme.spaceMd,
                  bottom: AppTheme.spaceLg,
                ),
                child: Text(
                  'Log Your Mood',
                  style: textTheme.titleLarge?.copyWith(
                    color: colorScheme.onSurface,
                  ),
                ),
              ),

              // Content
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTheme.screenHPadding,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Mood Selector
                    Text(
                      'How are you feeling?',
                      style: textTheme.titleMedium?.copyWith(
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: AppTheme.spaceSm + 4),
                    Semantics(
                      label: 'Mood level, select 1 to 5',
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: List.generate(_moodOptions.length, (index) {
                          final mood = _moodOptions[index];
                          final level = index + 1;
                          final selected = _selectedMood == level;
                          return _MoodOption(
                            icon: mood.icon,
                            label: mood.label,
                            level: level,
                            selected: selected,
                            onTap: () => setState(() => _selectedMood = level),
                          );
                        }),
                      ),
                    ),

                    const SizedBox(height: AppTheme.spaceLg),

                    // Energy Level
                    Text(
                      'Energy Level',
                      style: textTheme.titleMedium?.copyWith(
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: AppTheme.spaceSm),
                    Column(
                      children: [
                        Text(
                          _energyLevel.round().toString(),
                          style: textTheme.displaySmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppTheme.lilacColor,
                          ),
                        ),
                        const SizedBox(height: AppTheme.spaceSm),
                        Semantics(
                          label: 'Energy level',
                          value: '${_energyLevel.round()} of 5',
                          child: Row(
                            children: [
                              Text(
                                '1',
                                style: textTheme.labelSmall?.copyWith(
                                  color: AppTheme.textSecondaryColor,
                                ),
                              ),
                              Expanded(
                                child: SliderTheme(
                                  data: SliderThemeData(
                                    activeTrackColor: AppTheme.lilacColor,
                                    inactiveTrackColor: AppTheme.chipBgColor,
                                    thumbColor: AppTheme.surfaceColor,
                                    overlayColor:
                                        AppTheme.lilacColor.withValues(
                                          alpha: 0.12,
                                        ),
                                    trackHeight: 8,
                                    thumbShape:
                                        const RoundSliderThumbShape(
                                          enabledThumbRadius: 10,
                                        ),
                                  ),
                                  child: Slider(
                                    value: _energyLevel,
                                    min: 1,
                                    max: 5,
                                    divisions: 4,
                                    onChanged: (value) {
                                      setState(() => _energyLevel = value);
                                    },
                                  ),
                                ),
                              ),
                              Text(
                                '5',
                                style: textTheme.labelSmall?.copyWith(
                                  color: AppTheme.textSecondaryColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppTheme.spaceLg),

                    // Notes Input
                    Text(
                      'Add a note (optional)',
                      style: textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w500,
                        color: AppTheme.textSecondaryColor,
                      ),
                    ),
                    const SizedBox(height: AppTheme.spaceSm),
                    Semantics(
                      label: 'Optional mood note',
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceTertiaryColor,
                          borderRadius:
                              BorderRadius.circular(AppTheme.radiusSm),
                          border: Border.all(
                            color: AppTheme.textPrimaryColor.withValues(
                              alpha: 0.06,
                            ),
                          ),
                        ),
                        constraints: const BoxConstraints(minHeight: 44),
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.screenHPadding,
                          vertical: AppTheme.spaceSm + 4,
                        ),
                        child: TextField(
                          controller: _notesController,
                          maxLines: 3,
                          style: textTheme.bodyMedium?.copyWith(
                            color: colorScheme.onSurface,
                          ),
                          decoration: InputDecoration(
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                            hintText: 'How are you feeling today?',
                            hintStyle: textTheme.bodyMedium?.copyWith(
                              color: AppTheme.textSecondaryColor.withValues(
                                alpha: 0.7,
                              ),
                            ),
                            filled: false,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: AppTheme.spaceLg),

                    // Save Button
                    Semantics(
                      label: 'Save mood entry',
                      button: true,
                      child: SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _selectedMood == null ? null : _save,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.coralColor,
                            foregroundColor: AppTheme.surfaceColor,
                            disabledBackgroundColor:
                                AppTheme.coralColor.withValues(alpha: 0.4),
                            disabledForegroundColor:
                                AppTheme.surfaceColor.withValues(alpha: 0.4),
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(AppTheme.radiusFull),
                            ),
                          ),
                          child: Text(
                            'Save Entry',
                            style: textTheme.titleMedium?.copyWith(
                              color: AppTheme.surfaceColor,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MoodOption extends StatelessWidget {
  const _MoodOption({
    required this.icon,
    required this.label,
    required this.level,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final int level;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Semantics(
      label: '$label, mood level $level of 5',
      selected: selected,
      child: GestureDetector(
        onTap: onTap,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected
                    ? AppTheme.coralTintColor
                    : AppTheme.chipBgColor,
                border: selected
                    ? Border.all(color: AppTheme.coralColor, width: 2)
                    : null,
              ),
              child: Icon(
                icon,
                size: 24,
                color: selected
                    ? AppTheme.coralColor
                    : AppTheme.textSecondaryColor,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: textTheme.labelLarge?.copyWith(
                fontSize: 14,
                color: selected
                    ? AppTheme.coralColor
                    : AppTheme.textSecondaryColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
