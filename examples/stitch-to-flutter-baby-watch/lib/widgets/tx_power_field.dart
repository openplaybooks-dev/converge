import 'package:flutter/material.dart';

class TxPowerField extends StatelessWidget {
  const TxPowerField({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel('TX Power (dBm)', textTheme, colorScheme),
        const SizedBox(height: 8),
        TextField(
          keyboardType: const TextInputType.numberWithOptions(signed: true),
          style: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: colorScheme.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: colorScheme.outlineVariant),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: colorScheme.outlineVariant),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: colorScheme.primary, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Cường độ tín hiệu hiệu chỉnh tại 1m',
          style: textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildLabel(String text, TextTheme textTheme, ColorScheme colorScheme) {
    return Text(
      text.toUpperCase(),
      style: textTheme.labelSmall?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: 0.05,
        color: colorScheme.onSurfaceVariant,
      ),
    );
  }
}