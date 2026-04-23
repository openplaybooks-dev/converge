import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final ColorScheme colorScheme;

  const NavItem({
    super.key,
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    final color = isSelected
        ? AppTheme.brandGreen
        : AppTheme.brandOnSurfaceVariant.withValues(alpha: 0.6);
    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 26, color: color),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontFamily: 'Manrope',
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
