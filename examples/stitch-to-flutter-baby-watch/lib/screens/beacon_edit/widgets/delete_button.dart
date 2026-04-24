import 'package:flutter/material.dart';

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
          foregroundColor: colorScheme.error,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(9999),
            side: BorderSide(color: colorScheme.error.withValues(alpha: 0.2)),
          ),
          backgroundColor: colorScheme.errorContainer,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.delete, size: 20),
            const SizedBox(width: 8),
            Text(
              'Xóa Beacon',
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
