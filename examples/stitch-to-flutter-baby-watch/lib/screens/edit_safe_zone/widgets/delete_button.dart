import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

class DeleteButton extends StatelessWidget {
  const DeleteButton({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return SizedBox(
      width: double.infinity,
      child: TextButton(
        onPressed: () => throw UnimplementedError(),
        style: TextButton.styleFrom(
          backgroundColor: colorScheme.errorContainer,
          foregroundColor: colorScheme.error,
          padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.delete, size: 20, color: colorScheme.error),
            const SizedBox(width: AppTheme.spaceSm),
            Text(
              'Xóa vùng an toàn',
              style: textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: colorScheme.error,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
