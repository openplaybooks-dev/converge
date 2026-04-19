import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class ModeSelectorPill extends StatelessWidget {
  final String modeLabel;
  final VoidCallback? onTap;

  const ModeSelectorPill({
    super.key,
    required this.modeLabel,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Center(
      child: Material(
        color: AppTheme.coralTintColor,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppTheme.screenHPadding,
              vertical: AppTheme.spaceSm,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  modeLabel,
                  style: textTheme.titleMedium?.copyWith(
                    color: AppTheme.coralColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 6),
                const Icon(
                  Icons.keyboard_arrow_down,
                  color: AppTheme.coralColor,
                  size: 16,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
