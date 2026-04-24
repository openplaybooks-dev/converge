import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class ActionButtons extends StatelessWidget {
  const ActionButtons({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Đã chấp nhận lời mời tham gia nhóm theo dõi'),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.brandOnSurface,
              foregroundColor: colorScheme.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              ),
            ),
            child: Text(
              'Chấp nhận',
              style: textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        const SizedBox(height: AppTheme.spaceMd),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: OutlinedButton(
            onPressed: () => throw UnimplementedError(),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.brandOnSurfaceVariant,
              side: BorderSide(
                color: colorScheme.outline,
                width: 2,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              ),
            ),
            child: Text(
              'Từ chối',
              style: textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ],
    );
  }
}