import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class PaginationDots extends StatelessWidget {
  final int count;
  final int activeIndex;

  const PaginationDots({
    super.key,
    required this.count,
    required this.activeIndex,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (index) {
        final isActive = index == activeIndex;
        return Padding(
          padding: EdgeInsets.only(left: index > 0 ? 6 : 0),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            curve: AppTheme.springCurve,
            width: isActive ? 16 : 8,
            height: 8,
            decoration: BoxDecoration(
              color: isActive ? AppTheme.coralColor : AppTheme.chipBgColor,
              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            ),
          ),
        );
      }),
    );
  }
}
