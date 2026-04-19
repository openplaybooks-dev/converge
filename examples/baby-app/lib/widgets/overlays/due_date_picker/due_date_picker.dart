import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

/// Dialog overlay for selecting a due date via a calendar grid.
///
/// Returns the selected [DateTime] via [Navigator.pop], or `null`
/// if dismissed without confirming.
class DueDatePicker extends StatefulWidget {
  const DueDatePicker({
    super.key,
    this.initialDate,
  });

  /// The currently-set due date, shown as pre-selected in the calendar.
  final DateTime? initialDate;

  @override
  State<DueDatePicker> createState() => _DueDatePickerState();
}

class _DueDatePickerState extends State<DueDatePicker> {
  late DateTime _displayedMonth;
  DateTime? _selectedDate;

  @override
  void initState() {
    super.initState();
    _selectedDate = widget.initialDate;
    _displayedMonth = widget.initialDate ?? DateTime.now();
    // Normalize to first of month.
    _displayedMonth = DateTime(_displayedMonth.year, _displayedMonth.month);
  }

  void _previousMonth() {
    setState(() {
      _displayedMonth = DateTime(
        _displayedMonth.year,
        _displayedMonth.month - 1,
      );
    });
  }

  void _nextMonth() {
    setState(() {
      _displayedMonth = DateTime(
        _displayedMonth.year,
        _displayedMonth.month + 1,
      );
    });
  }

  void _selectDay(int day) {
    setState(() {
      _selectedDate = DateTime(
        _displayedMonth.year,
        _displayedMonth.month,
        day,
      );
    });
  }

  void _confirm() {
    Navigator.pop(context, _selectedDate);
  }

  void _cancel() {
    Navigator.pop<DateTime>(context);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    final today = DateUtils.dateOnly(DateTime.now());
    final daysInMonth = DateUtils.getDaysInMonth(
      _displayedMonth.year,
      _displayedMonth.month,
    );
    // Sunday = 0 .. Saturday = 6 (DateTime.sunday == 7, so % 7).
    final firstWeekday = DateTime(
          _displayedMonth.year,
          _displayedMonth.month,
        ).weekday %
        7;

    final monthLabel = _monthName(_displayedMonth.month);
    final yearLabel = _displayedMonth.year.toString();

    return Semantics(
      label: 'Due date picker dialog',
      child: Container(
        constraints: const BoxConstraints(maxWidth: 360),
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          boxShadow: AppTheme.shadowProminent,
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 9.1 Title
              Text(
                'Set Due Date',
                style: textTheme.titleLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
              ),

              const SizedBox(height: 20),

              // 9.2 Month Navigation Row
              Semantics(
                label:
                    'Navigate months. Currently showing $monthLabel $yearLabel',
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _NavArrow(
                      icon: Icons.chevron_left,
                      semanticsLabel: 'Previous month',
                      onTap: _previousMonth,
                    ),
                    Text(
                      '$monthLabel $yearLabel',
                      style: textTheme.titleMedium?.copyWith(
                        color: colorScheme.onSurface,
                      ),
                    ),
                    _NavArrow(
                      icon: Icons.chevron_right,
                      semanticsLabel: 'Next month',
                      onTap: _nextMonth,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.spaceMd),

              // 9.3 Weekday Header Row
              const Row(
                children: [
                  _WeekdayLabel('SUN'),
                  _WeekdayLabel('MON'),
                  _WeekdayLabel('TUE'),
                  _WeekdayLabel('WED'),
                  _WeekdayLabel('THU'),
                  _WeekdayLabel('FRI'),
                  _WeekdayLabel('SAT'),
                ],
              ),

              const SizedBox(height: AppTheme.spaceSm),

              // 9.4 Calendar Day Grid
              _buildCalendarGrid(
                daysInMonth: daysInMonth,
                firstWeekday: firstWeekday,
                today: today,
                textTheme: textTheme,
              ),

              // Divider
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                child: Divider(
                  height: 1,
                  thickness: 1,
                  color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
                ),
              ),

              // 9.5 Action Row
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  // Cancel
                  Semantics(
                    label: 'Cancel and keep current due date',
                    button: true,
                    child: SizedBox(
                      height: 44,
                      child: OutlinedButton(
                        onPressed: _cancel,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.textPrimaryColor,
                          side: BorderSide(
                            color: AppTheme.textPrimaryColor.withValues(
                              alpha: 0.06,
                            ),
                            width: 1.5,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(AppTheme.radiusFull),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppTheme.spaceLg,
                          ),
                        ),
                        child: Text(
                          'Cancel',
                          style: textTheme.titleMedium?.copyWith(
                            color: AppTheme.textPrimaryColor,
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(width: AppTheme.cardSpacing),

                  // Confirm
                  Semantics(
                    label: 'Confirm selected due date',
                    button: true,
                    child: SizedBox(
                      height: 44,
                      child: ElevatedButton(
                        onPressed: _selectedDate == null ? null : _confirm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.coralColor,
                          foregroundColor: AppTheme.surfaceColor,
                          shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(AppTheme.radiusFull),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppTheme.spaceLg,
                          ),
                        ),
                        child: Text(
                          'Confirm',
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
      ),
    );
  }

  Widget _buildCalendarGrid({
    required int daysInMonth,
    required int firstWeekday,
    required DateTime today,
    required TextTheme textTheme,
  }) {
    final cells = <Widget>[];

    // Leading empty cells.
    for (var i = 0; i < firstWeekday; i++) {
      cells.add(const SizedBox.shrink());
    }

    // Day cells.
    for (var day = 1; day <= daysInMonth; day++) {
      final date = DateTime(
        _displayedMonth.year,
        _displayedMonth.month,
        day,
      );
      final isToday = date == today;
      final isSelected = _selectedDate != null &&
          date.year == _selectedDate!.year &&
          date.month == _selectedDate!.month &&
          date.day == _selectedDate!.day;

      cells.add(
        _DayCell(
          day: day,
          isToday: isToday,
          isSelected: isSelected,
          monthLabel: _monthName(_displayedMonth.month),
          yearLabel: _displayedMonth.year.toString(),
          textTheme: textTheme,
          onTap: () => _selectDay(day),
        ),
      );
    }

    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 4,
      crossAxisSpacing: 4,
      children: cells,
    );
  }

  static String _monthName(int month) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month - 1];
  }
}

class _NavArrow extends StatelessWidget {
  const _NavArrow({
    required this.icon,
    required this.semanticsLabel,
    required this.onTap,
  });

  final IconData icon;
  final String semanticsLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticsLabel,
      button: true,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(
            icon,
            size: 22,
            color: AppTheme.lilacColor,
          ),
        ),
      ),
    );
  }
}

class _WeekdayLabel extends StatelessWidget {
  const _WeekdayLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Expanded(
      child: Center(
        child: Text(
          label,
          style: textTheme.labelSmall?.copyWith(
            fontSize: 11,
            color: AppTheme.textSecondaryColor,
            letterSpacing: 0.8,
          ),
        ),
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.isToday,
    required this.isSelected,
    required this.monthLabel,
    required this.yearLabel,
    required this.textTheme,
    required this.onTap,
  });

  final int day;
  final bool isToday;
  final bool isSelected;
  final String monthLabel;
  final String yearLabel;
  final TextTheme textTheme;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color textColor;
    FontWeight weight;

    if (isSelected) {
      bgColor = AppTheme.coralColor;
      textColor = AppTheme.surfaceColor;
      weight = FontWeight.w700;
    } else if (isToday) {
      bgColor = AppTheme.coralTintColor;
      textColor = AppTheme.coralColor;
      weight = FontWeight.w500;
    } else {
      bgColor = AppTheme.surfaceColor.withValues(alpha: 0);
      textColor = AppTheme.textPrimaryColor;
      weight = FontWeight.w500;
    }

    final semanticsLabel = isSelected
        ? '$day $monthLabel $yearLabel, selected'
        : isToday
            ? '$day $monthLabel $yearLabel, today'
            : '$day $monthLabel $yearLabel';

    return Semantics(
      label: semanticsLabel,
      selected: isSelected,
      button: true,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Center(
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: bgColor,
            ),
            alignment: Alignment.center,
            child: Text(
              '$day',
              style: textTheme.bodyMedium?.copyWith(
                fontSize: 14,
                fontWeight: weight,
                color: textColor,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
