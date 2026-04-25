import 'package:flutter/material.dart';

import 'package:baby_watch/screens/co_guardians_list/widgets/avatar_with_shield_badge.dart';
import 'package:baby_watch/theme/app_spacing.dart';
import 'package:baby_watch/widgets/info_row.dart';
import 'package:baby_watch/widgets/inviter_chip.dart';

enum InviteAcceptResult { accepted, declined, dismissed }

class InviteAccept extends StatelessWidget {
  const InviteAccept({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      backgroundColor: colorScheme.surfaceContainerLowest,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const AvatarWithShieldBadge(),
                  const SizedBox(height: AppSpacing.lg),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Text(
                        'Bé Na',
                        style: textTheme.headlineLarge?.copyWith(
                          color: colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Mẹ đã mời bạn',
                            style: textTheme.bodyMedium?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          InviterChip(
                            label: 'Người sở hữu',
                            background: colorScheme.surfaceContainerHigh,
                            foreground: colorScheme.onSurfaceVariant,
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Column(
                    children: [
                      InfoRow(
                        icon: Icons.notifications_active,
                        iconColor: colorScheme.tertiary,
                        iconBackground: colorScheme.tertiaryContainer,
                        body:
                            'Bằng cách chấp nhận, bạn sẽ nhận được thông báo khi beacon này mất kết nối',
                      ),
                      const SizedBox(height: AppSpacing.md),
                      InfoRow(
                        icon: Icons.group_off,
                        iconColor: colorScheme.secondary,
                        iconBackground: colorScheme.surfaceContainerHigh,
                        body: 'Bạn có thể rời nhóm theo dõi bất kỳ lúc nào',
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: FilledButton(
                          autofocus: true,
                          style: FilledButton.styleFrom(
                            backgroundColor: colorScheme.onSurface,
                            foregroundColor: colorScheme.surface,
                            shape: const StadiumBorder(),
                          ),
                          onPressed: () => Navigator.of(context)
                              .pop(InviteAcceptResult.accepted),
                          child: Text(
                            'Chấp nhận',
                            style: textTheme.labelLarge,
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: TextButton(
                          style: TextButton.styleFrom(
                            foregroundColor: colorScheme.onSurfaceVariant,
                          ),
                          onPressed: () => Navigator.of(context)
                              .pop(InviteAcceptResult.declined),
                          child: Text(
                            'Từ chối',
                            style: textTheme.labelLarge,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              width: double.infinity,
              color: colorScheme.surfaceContainerLow,
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.verified_user,
                    size: 16,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'Bảo mật bởi hệ thống mã hóa BabyGuard',
                    style: textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
