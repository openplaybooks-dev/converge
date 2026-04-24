import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class HistoryFilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;

  const HistoryFilterChip({super.key, required this.label, required this.isSelected});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      decoration: BoxDecoration(
        color: isSelected
            ? AppTheme.brandOnSurface
            : AppTheme.brandSurfaceContainer,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'Manrope',
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: isSelected
              ? colorScheme.onPrimary
              : AppTheme.brandOnSurfaceVariant,
        ),
      ),
    );
  }
}