import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class InviteGuardianButton extends StatelessWidget {
  const InviteGuardianButton({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: () => throw UnimplementedError(),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.brandGreen,
          foregroundColor: colorScheme.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          ),
          elevation: 4,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.person_add, size: 24),
            const SizedBox(width: 12),
            Text(
              'Mời người cùng theo dõi',
              style: textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
