import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

class SafeZoneFormField extends StatelessWidget {
  final String label;
  final String hint;

  const SafeZoneFormField({
    super.key,
    required this.label,
    required this.hint,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.1,
            color: AppTheme.brandOnSurfaceVariant,
          ),
        ),
        const SizedBox(height: AppTheme.spaceSm),
        TextField(
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: textTheme.bodyLarge?.copyWith(
              color: AppTheme.brandOnSurfaceVariant.withValues(alpha: 0.6),
            ),
            filled: true,
            fillColor: colorScheme.surface,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 20,
              vertical: AppTheme.spaceMd,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
              borderSide: const BorderSide(color: AppTheme.brandBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
              borderSide: const BorderSide(color: AppTheme.brandBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
              borderSide: const BorderSide(
                color: AppTheme.brandGreen,
                width: 2,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
