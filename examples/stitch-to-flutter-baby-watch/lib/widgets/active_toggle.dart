import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class ActiveToggle extends StatelessWidget {
  const ActiveToggle({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: AppTheme.brandBorder),
      ),
      child: Row(
        children: [
          Icon(
            Icons.verified_user,
            color: AppTheme.brandGreen,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Kích hoạt vùng an toàn',
              style: textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppTheme.brandOnSurface,
              ),
            ),
          ),
          Container(
            width: 48,
            height: 24,
            decoration: BoxDecoration(
              color: AppTheme.brandGreen,
              borderRadius: const BorderRadius.all(Radius.circular(9999)),
            ),
            alignment: Alignment.centerRight,
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: SizedBox(
              width: 16,
              height: 16,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: colorScheme.surface,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
