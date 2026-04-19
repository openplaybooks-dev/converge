import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';

class CategoryChips extends StatelessWidget {
  const CategoryChips({
    super.key,
    required this.categories,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<String> categories;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppTheme.spaceSm),
        itemBuilder: (context, index) {
          final isSelected = index == selectedIndex;
          return ChoiceChip(
            label: Text(categories[index]),
            selected: isSelected,
            onSelected: (_) => onSelected(index),
            backgroundColor: AppTheme.chipBgColor,
            selectedColor: AppTheme.lilacTintColor,
            labelStyle: textTheme.bodySmall?.copyWith(
              color: isSelected
                  ? AppTheme.lilacColor
                  : AppTheme.textSecondaryColor,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            ),
            shape: const StadiumBorder(),
            side: BorderSide.none,
            showCheckmark: false,
            padding: const EdgeInsets.symmetric(
              horizontal: AppTheme.spaceMd,
              vertical: AppTheme.spaceXs,
            ),
          );
        },
      ),
    );
  }
}
