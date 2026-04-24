import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';

class TrustNotesContainer extends StatelessWidget {
  const TrustNotesContainer({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.brandGreenLight,
              ),
              child: Icon(
                Icons.notifications_active,
                size: 20,
                color: AppTheme.brandGreen,
              ),
            ),
            const SizedBox(width: AppTheme.spaceMd),
            Expanded(
              child: Text(
                'Bằng cách chấp nhận, bạn sẽ nhận được thông báo khi beacon này mất kết nối',
                style: textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                  color: AppTheme.brandOnSurfaceVariant,
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppTheme.spaceMd),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.brandSurface,
              ),
              child: Icon(
                Icons.group_off,
                size: 20,
                color: colorScheme.outline,
              ),
            ),
            const SizedBox(width: AppTheme.spaceMd),
            Expanded(
              child: Text(
                'Bạn có thể rời nhóm theo dõi bất kỳ lúc nào',
                style: textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                  color: AppTheme.brandOnSurfaceVariant,
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}