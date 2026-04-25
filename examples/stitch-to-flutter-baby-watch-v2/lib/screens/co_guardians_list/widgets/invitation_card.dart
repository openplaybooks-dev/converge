import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_spacing.dart';
import 'avatar_with_shield_badge.dart';
import 'package:baby_watch/widgets/info_row.dart';
import 'package:baby_watch/widgets/inviter_chip.dart';

class InvitationCard extends StatelessWidget {
  const InvitationCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const AvatarWithShieldBadge(),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  'Bé Na',
                  style: textTheme.headlineLarge
                      ?.copyWith(color: colorScheme.onSurface),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.xs),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        'Mẹ đã mời bạn',
                        style: textTheme.bodyMedium
                            ?.copyWith(color: colorScheme.onSurfaceVariant),
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
                const SizedBox(height: AppSpacing.lg),
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
                const SizedBox(height: AppSpacing.lg),
                // @converge:element action:accept-invitation
                FilledButton(
                  onPressed: () => context.go('/devices'),
                  style: FilledButton.styleFrom(
                    backgroundColor: colorScheme.onSurface,
                    foregroundColor: colorScheme.surface,
                    minimumSize: const Size.fromHeight(56),
                    shape: const StadiumBorder(),
                  ),
                  child: Text(
                    'Chấp nhận',
                    style: textTheme.labelLarge
                        ?.copyWith(color: colorScheme.surface),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                // @converge:element action:decline-invitation
                TextButton(
                  onPressed: () => context.go('/home'),
                  style: TextButton.styleFrom(
                    foregroundColor: colorScheme.onSurfaceVariant,
                    minimumSize: const Size.fromHeight(56),
                    shape: const StadiumBorder(),
                  ),
                  child: Text(
                    'Từ chối',
                    style: textTheme.labelLarge
                        ?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                ),
              ],
            ),
          ),
          Container(
            color: colorScheme.surfaceContainerLow,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.md,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.verified_user,
                  size: 24,
                  color: colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: AppSpacing.sm),
                Flexible(
                  child: Text(
                    'Bảo mật bởi hệ thống mã hóa BabyGuard',
                    style: textTheme.labelSmall
                        ?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

