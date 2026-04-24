import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

class AddressField extends StatelessWidget {
  final String? initialValue;

  const AddressField({super.key, this.initialValue});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Địa chỉ',
          style: textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.1,
            color: AppTheme.brandOnSurfaceVariant,
          ),
        ),
        const SizedBox(height: AppTheme.spaceSm),
        TextFormField(
          initialValue: initialValue,
          decoration: InputDecoration(
            hintText: '123 Đường ABC, Quận XYZ',
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
            suffixIcon: IconButton(
              onPressed: () => throw UnimplementedError(),
              icon: const Icon(
                Icons.location_on,
                color: AppTheme.brandGreen,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
