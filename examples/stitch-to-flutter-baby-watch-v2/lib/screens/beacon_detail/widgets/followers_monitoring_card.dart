import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_spacing.dart';
import '../../../theme/app_theme.dart';

class FollowersMonitoringCard extends StatelessWidget {
  const FollowersMonitoringCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    final appSemantic = theme.extension<AppSemanticColors>()!;

    return Card(
      color: colorScheme.surfaceContainerLowest,
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Người cùng theo dõi',
                    style: textTheme.titleMedium
                        ?.copyWith(color: colorScheme.onSurface),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: colorScheme.secondaryContainer,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(
                    Icons.group,
                    size: 24,
                    color: colorScheme.onSecondaryContainer,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),

            // User 1: Mẹ
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: colorScheme.secondaryContainer,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Text(
                    'M',
                    style: textTheme.titleMedium
                        ?.copyWith(color: colorScheme.secondary),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Mẹ',
                        style: textTheme.titleMedium
                            ?.copyWith(color: colorScheme.onSurface),
                      ),
                      Text(
                        'Vừa xong',
                        style: textTheme.labelSmall
                            ?.copyWith(color: colorScheme.outline),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.secondaryContainer,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: colorScheme.secondary,
                          shape: BoxShape.circle,
                        ),
                      ).animate(onPlay: (c) => c.repeat()).fadeIn(
                        duration: 600.ms,
                        curve: Curves.easeInOut,
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        'Đang gần beacon',
                        style: textTheme.labelSmall?.copyWith(
                          color: colorScheme.onSecondaryContainer,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // User 2: Bố
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: appSemantic.peach,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Text(
                    'B',
                    style: textTheme.titleMedium
                        ?.copyWith(color: appSemantic.honey),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Bố',
                        style: textTheme.titleMedium
                            ?.copyWith(color: colorScheme.onSurface),
                      ),
                      Text(
                        '5 phút trước',
                        style: textTheme.labelSmall
                            ?.copyWith(color: colorScheme.outline),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  decoration: BoxDecoration(
                    color: appSemantic.peach,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(
                    'Xa / không thấy',
                    style: textTheme.labelSmall
                        ?.copyWith(color: appSemantic.honey),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // User 3: Bà Nội
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Text(
                    'B',
                    style: textTheme.titleMedium
                        ?.copyWith(color: colorScheme.outline),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Bà Nội',
                        style: textTheme.titleMedium
                            ?.copyWith(color: colorScheme.onSurfaceVariant),
                      ),
                      Text(
                        '2 giờ trước',
                        style: textTheme.labelSmall
                            ?.copyWith(color: colorScheme.outline),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(
                    'Ngoại tuyến',
                    style: textTheme.labelSmall
                        ?.copyWith(color: colorScheme.outline),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),

            // @converge:element action:invite-follower
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: colorScheme.primary,
                foregroundColor: colorScheme.onPrimary,
              ),
              onPressed: () => context.push('/devices/co-guardians'),
              icon: Icon(Icons.person_add, color: colorScheme.onPrimary),
              label: const Text('Mời người cùng theo dõi'),
            ),
            const SizedBox(height: AppSpacing.md),
            // @converge:element navigate:manage-followers
            InkWell(
              onTap: () => context.push('/devices/co-guardians'),
              child: Row(
                children: [
                  Text(
                    'Quản lý danh sách',
                    style: textTheme.labelLarge
                        ?.copyWith(color: colorScheme.primary),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Icon(
                    Icons.arrow_forward,
                    size: 24,
                    color: colorScheme.primary,
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
