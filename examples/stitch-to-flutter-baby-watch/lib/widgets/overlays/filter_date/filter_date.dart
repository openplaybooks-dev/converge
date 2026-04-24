import 'package:flutter/material.dart';

import 'package:folio/theme/app_theme.dart';

/// Filter date range overlay — shown via showModalBottomSheet().
/// Returns a [DateRange?] via Navigator.pop.
class FilterDate extends StatefulWidget {
  const FilterDate({super.key});

  @override
  State<FilterDate> createState() => _FilterDateState();
}

class _FilterDateState extends State<FilterDate> {
  DateTime? _fromDate;
  DateTime? _toDate;
  String? _selectedPreset;

  Future<void> _selectDate(bool isFrom) async {
    final initialDate = isFrom ? _fromDate : _toDate;
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        if (isFrom) {
          _fromDate = picked;
        } else {
          _toDate = picked;
        }
        _selectedPreset = null;
      });
    }
  }

  void _applyPreset(String preset) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    setState(() {
      _selectedPreset = preset;
      switch (preset) {
        case 'today':
          _fromDate = today;
          _toDate = today;
          break;
        case 'yesterday':
          final yesterday = today.subtract(const Duration(days: 1));
          _fromDate = yesterday;
          _toDate = yesterday;
          break;
        case '7days':
          _fromDate = today.subtract(const Duration(days: 6));
          _toDate = today;
          break;
        case '30days':
          _fromDate = today.subtract(const Duration(days: 29));
          _toDate = today;
          break;
      }
    });
  }

  void _reset() {
    setState(() {
      _fromDate = null;
      _toDate = null;
      _selectedPreset = null;
    });
  }

  void _apply() {
    Navigator.pop(context, DateRange(from: _fromDate, to: _toDate));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppTheme.radiusLg),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: AppTheme.spaceLg),
              decoration: BoxDecoration(
                color: AppTheme.brandBorder,
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              ),
            ),

            // Title
            Text(
              'Lọc theo ngày',
              style: textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
              ),
            ),

            const SizedBox(height: AppTheme.spaceLg),

            // Date Range Row
            Row(
              children: [
                Expanded(
                  child: _DateField(
                    label: 'Từ ngày',
                    date: _fromDate,
                    onTap: () => _selectDate(true),
                    colorScheme: colorScheme,
                    textTheme: textTheme,
                  ),
                ),
                const SizedBox(width: AppTheme.spaceMd),
                Expanded(
                  child: _DateField(
                    label: 'Đến ngày',
                    date: _toDate,
                    onTap: () => _selectDate(false),
                    colorScheme: colorScheme,
                    textTheme: textTheme,
                  ),
                ),
              ],
            ),

            const SizedBox(height: AppTheme.spaceLg),

            // Quick Filters
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _ChipButton(
                    label: 'Hôm nay',
                    isSelected: _selectedPreset == 'today',
                    onTap: () => _applyPreset('today'),
                    colorScheme: colorScheme,
                    textTheme: textTheme,
                  ),
                  const SizedBox(width: AppTheme.spaceMd),
                  _ChipButton(
                    label: 'Hôm qua',
                    isSelected: _selectedPreset == 'yesterday',
                    onTap: () => _applyPreset('yesterday'),
                    colorScheme: colorScheme,
                    textTheme: textTheme,
                  ),
                  const SizedBox(width: AppTheme.spaceMd),
                  _ChipButton(
                    label: '7 ngày qua',
                    isSelected: _selectedPreset == '7days',
                    onTap: () => _applyPreset('7days'),
                    colorScheme: colorScheme,
                    textTheme: textTheme,
                  ),
                  const SizedBox(width: AppTheme.spaceMd),
                  _ChipButton(
                    label: '30 ngày qua',
                    isSelected: _selectedPreset == '30days',
                    onTap: () => _applyPreset('30days'),
                    colorScheme: colorScheme,
                    textTheme: textTheme,
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppTheme.spaceLg),

            // Action Buttons
            Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: FilledButton(
                    onPressed: _apply,
                    style: FilledButton.styleFrom(
                      backgroundColor: colorScheme.onSurface,
                      foregroundColor: colorScheme.onPrimary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                      ),
                    ),
                    child: const Text('Áp dụng'),
                  ),
                ),
                const SizedBox(height: AppTheme.spaceMd),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: OutlinedButton(
                    onPressed: _reset,
                    style: OutlinedButton.styleFrom(
                      backgroundColor: AppTheme.brandSurfaceContainer,
                      foregroundColor: colorScheme.onSurface,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                      ),
                      side: BorderSide.none,
                    ),
                    child: const Text('Đặt lại'),
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

class _DateField extends StatelessWidget {
  final String label;
  final DateTime? date;
  final VoidCallback onTap;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _DateField({
    required this.label,
    required this.date,
    required this.onTap,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.05,
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: AppTheme.spaceSm),
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppTheme.spaceMd,
              vertical: AppTheme.spaceMd,
            ),
            decoration: BoxDecoration(
              color: AppTheme.brandSurfaceContainer,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              border: Border.all(color: AppTheme.brandBorder),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    date != null
                        ? '${date!.day.toString().padLeft(2, '0')}/${date!.month.toString().padLeft(2, '0')}/${date!.year}'
                        : '--/--/----',
                    style: textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurface,
                    ),
                  ),
                ),
                Icon(
                  Icons.calendar_today,
                  size: 18,
                  color: colorScheme.onSurfaceVariant,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ChipButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _ChipButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spaceMd,
          vertical: AppTheme.spaceSm,
        ),
        decoration: BoxDecoration(
          color: isSelected ? colorScheme.onSurface : AppTheme.brandSurfaceContainer,
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        ),
        child: Text(
          label,
          style: textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: isSelected ? colorScheme.onPrimary : colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

/// Simple date range result.
class DateRange {
  final DateTime? from;
  final DateTime? to;

  DateRange({this.from, this.to});
}
