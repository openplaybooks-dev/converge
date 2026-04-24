import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class MuteNotificationsRow extends StatelessWidget {
  const MuteNotificationsRow({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _MuteButton(
            label: '5 min',
            isSelected: true,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const SizedBox(width: AppTheme.cardSpacing),
          _MuteButton(
            label: '10 min',
            isSelected: false,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
          const SizedBox(width: AppTheme.cardSpacing),
          _MuteButton(
            label: '15 min',
            isSelected: false,
            colorScheme: colorScheme,
            textTheme: textTheme,
          ),
        ],
      ),
    );
  }
}

class _MuteButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _MuteButton({
    required this.label,
    required this.isSelected,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color:
            isSelected ? colorScheme.onSurface : AppTheme.brandSurfaceContainer,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
      ),
      child: Row(
        children: [
          Icon(
            Icons.schedule,
            size: 18,
            color:
                isSelected ? colorScheme.surface : colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: isSelected
                  ? colorScheme.surface
                  : colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
