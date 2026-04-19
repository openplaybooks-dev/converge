import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class CalendarCard extends StatelessWidget {
  const CalendarCard({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        boxShadow: AppTheme.shadowStandard,
      ),
      padding: const EdgeInsets.all(AppTheme.screenHPadding),
      child: Column(
        children: [
          // Month Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _monthNavButton(
                icon: Icons.chevron_left,
                label: 'Previous month',
              ),
              Text(
                'April 2026',
                style: textTheme.titleLarge?.copyWith(
                  color: AppTheme.textPrimaryColor,
                  fontWeight: FontWeight.w700,
                ),
              ),
              _monthNavButton(
                icon: Icons.chevron_right,
                label: 'Next month',
              ),
            ],
          ),
          const SizedBox(height: AppTheme.spaceMd),
          // Day-of-week headers
          _buildDayOfWeekRow(textTheme),
          const SizedBox(height: AppTheme.spaceSm),
          // Calendar Grid
          _buildCalendarGrid(textTheme),
          const SizedBox(height: AppTheme.spaceMd),
          // Legend
          _buildLegend(textTheme),
        ],
      ),
    )
        .animate()
        .fadeIn(
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }

  Widget _monthNavButton({
    required IconData icon,
    required String label,
  }) {
    return Semantics(
      label: label,
      button: true,
      child: SizedBox(
        width: 44,
        height: 44,
        child: IconButton(
          onPressed: () => debugPrint('Calendar: $label'),
          icon: Icon(
            icon,
            size: 20,
            color: AppTheme.textSecondaryColor,
          ),
        ),
      ),
    );
  }

  Widget _buildDayOfWeekRow(TextTheme textTheme) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: days
          .map(
            (d) => SizedBox(
              width: 40,
              child: Center(
                child: Text(
                  d,
                  style: textTheme.labelSmall?.copyWith(
                    color: AppTheme.textSecondaryColor,
                    fontWeight: FontWeight.w500,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildCalendarGrid(TextTheme textTheme) {
    // April 2026 starts on Wednesday (col index 2)
    // Row 1: 30, 31 (outside), 1-5
    // Row 2: 6-12
    // Row 3: 13-19
    // Row 4: 20-26
    // Row 5: 27-30, 1-3 (outside)
    return Semantics(
      label: 'April 2026 calendar',
      child: Column(
        children: [
          _buildCalendarRow([
            _outsideDay('30', textTheme),
            _outsideDay('31', textTheme),
            _periodDay(1, textTheme),
            _periodDay(2, textTheme),
            _periodDay(3, textTheme),
            _periodDay(4, textTheme),
            _periodDay(5, textTheme),
          ]),
          const SizedBox(height: AppTheme.spaceXs),
          _buildCalendarRow([
            _normalDay(6, textTheme),
            _normalDay(7, textTheme),
            _normalDay(8, textTheme),
            _normalDay(9, textTheme),
            _normalDay(10, textTheme),
            _normalDay(11, textTheme),
            _fertileDay(12, textTheme),
          ]),
          const SizedBox(height: AppTheme.spaceXs),
          _buildCalendarRow([
            _fertileDay(13, textTheme),
            _fertileDay(14, textTheme),
            _fertileDay(15, textTheme),
            _ovulationDay(16, textTheme),
            _fertileDay(17, textTheme),
            _todayDay(18, textTheme),
            _normalDay(19, textTheme),
          ]),
          const SizedBox(height: AppTheme.spaceXs),
          _buildCalendarRow([
            _normalDay(20, textTheme),
            _normalDay(21, textTheme),
            _normalDay(22, textTheme),
            _normalDay(23, textTheme),
            _normalDay(24, textTheme),
            _normalDay(25, textTheme),
            _normalDay(26, textTheme),
          ]),
          const SizedBox(height: AppTheme.spaceXs),
          _buildCalendarRow([
            _normalDay(27, textTheme),
            _normalDay(28, textTheme),
            _periodDay(29, textTheme, predicted: true),
            _periodDay(30, textTheme, predicted: true),
            _outsideDay('1', textTheme),
            _outsideDay('2', textTheme),
            _outsideDay('3', textTheme),
          ]),
        ],
      ),
    );
  }

  Widget _buildCalendarRow(List<Widget> cells) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: cells,
    );
  }

  Widget _outsideDay(String label, TextTheme textTheme) {
    return SizedBox(
      width: 40,
      height: 40,
      child: Center(
        child: Text(
          label,
          style: textTheme.bodySmall?.copyWith(
            color: AppTheme.textSecondaryColor.withValues(alpha: 0.4),
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _periodDay(int day, TextTheme textTheme, {bool predicted = false}) {
    return Semantics(
      label: '$day, ${predicted ? "predicted period" : "period day"}',
      button: true,
      child: GestureDetector(
        onTap: () => debugPrint('Selected period day $day'),
        child: Container(
          width: 40,
          height: 40,
          decoration: const BoxDecoration(
            color: AppTheme.coralColor,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            '$day',
            style: textTheme.bodySmall?.copyWith(
              color: AppTheme.surfaceColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _fertileDay(int day, TextTheme textTheme) {
    return Semantics(
      label: '$day, fertile window',
      button: true,
      child: GestureDetector(
        onTap: () => debugPrint('Selected fertile day $day'),
        child: Container(
          width: 40,
          height: 40,
          decoration: const BoxDecoration(
            color: AppTheme.coralTintColor,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            '$day',
            style: textTheme.bodySmall?.copyWith(
              color: AppTheme.textPrimaryColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _ovulationDay(int day, TextTheme textTheme) {
    return Semantics(
      label: '$day, ovulation day (estimated)',
      button: true,
      child: GestureDetector(
        onTap: () => debugPrint('Selected ovulation day $day'),
        child: Container(
          width: 40,
          height: 40,
          decoration: const BoxDecoration(
            color: AppTheme.lilacColor,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            '$day',
            style: textTheme.bodySmall?.copyWith(
              color: AppTheme.surfaceColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _todayDay(int day, TextTheme textTheme) {
    return Semantics(
      label: '$day, today',
      button: true,
      child: GestureDetector(
        onTap: () => debugPrint('Selected today day $day'),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: AppTheme.lilacTintColor,
              width: 2,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            '$day',
            style: textTheme.bodySmall?.copyWith(
              color: AppTheme.textPrimaryColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _normalDay(int day, TextTheme textTheme) {
    return Semantics(
      label: '$day, no data',
      button: true,
      child: GestureDetector(
        onTap: () => debugPrint('Selected day $day'),
        child: SizedBox(
          width: 40,
          height: 40,
          child: Center(
            child: Text(
              '$day',
              style: textTheme.bodySmall?.copyWith(
                color: AppTheme.textPrimaryColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLegend(TextTheme textTheme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _legendItem(AppTheme.coralColor, 'Period', textTheme),
        const SizedBox(width: AppTheme.spaceMd),
        _legendItem(AppTheme.coralTintColor, 'Fertile', textTheme),
        const SizedBox(width: AppTheme.spaceMd),
        _legendItem(AppTheme.lilacColor, 'Ovulation', textTheme),
      ],
    );
  }

  Widget _legendItem(Color color, String label, TextTheme textTheme) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: textTheme.labelSmall?.copyWith(
            color: AppTheme.textSecondaryColor,
            fontWeight: FontWeight.w400,
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}
