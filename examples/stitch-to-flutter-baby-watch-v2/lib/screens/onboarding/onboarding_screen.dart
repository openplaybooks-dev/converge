import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_spacing.dart';
import 'package:baby_watch/widgets/permission_card.dart';

// Wired via onboardingPermissionsProvider; permission_handler requests live behind
// the @converge:element navigate:onboarding-next handler.

class OnboardingScreen extends ConsumerWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leading:
            // @converge:element navigate:back
            IconButton(
          icon: const Icon(Icons.arrow_back),
          color: colorScheme.onSurface,
          tooltip: 'Quay lại',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/home');
            }
          },
        ),
        title: Text(
          'BabyGuard',
          style: textTheme.titleLarge?.copyWith(color: colorScheme.onSurface),
        ),
        actions: [
          // @converge:element navigate:skip-onboarding
          TextButton(
            onPressed: () => context.go('/home'),
            child: Text(
              'Bỏ qua',
              style: textTheme.labelLarge
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero illustration
            Center(
              child: Container(
                width: 176,
                height: 176,
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerLowest,
                  shape: BoxShape.circle,
                ),
                clipBehavior: Clip.antiAlias,
                child: CachedNetworkImage(
                  imageUrl:
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuCadKYhfXy1k7sOYtNyxNJl1mVS0I_hzqrPgNIQhMSm9NdgGRlstUZhmcKH6Qj9l-LU52WnnkFIO0PYeUqH1J5jx2RBTUcx-tBXN0FoT2sb-sFsu0W2GDBbhSut1Dgtk9RmE2999FjPbL0RFKdaqfI7jcZBPomEKOaGm3k2Rkbyj4ztobPgelJhv6T9cFNzf7-CkTf0YlnCWbfA7_TuHlJYEE4WG4uM__zHh3YV33LvPXOALiCkWJGFdyIwV-gA4Fz5IF8uuSGzd3hw',
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Headline & copy
            Text(
              'Chào mừng đến với BabyGuard',
              style: textTheme.headlineLarge
                  ?.copyWith(color: colorScheme.onSurface),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Sử dụng công nghệ Bluetooth năng lượng thấp để đảm bảo bé luôn '
              'nằm trong tầm kiểm soát của bạn.',
              style: textTheme.bodyMedium
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: AppSpacing.md),

            // Permission cards
            PermissionCard(
              icon: Icons.bluetooth,
              iconColor: colorScheme.tertiary,
              iconBackground: colorScheme.tertiaryContainer,
              title: 'Bluetooth',
              body:
                  'Kết nối liên tục với thiết bị đeo của bé để phát hiện khoảng cách an toàn.',
            ),
            const SizedBox(height: AppSpacing.md),
            PermissionCard(
              icon: Icons.location_on,
              iconColor: colorScheme.onSurfaceVariant,
              iconBackground: colorScheme.surfaceContainerHigh,
              title: 'Vị trí',
              body:
                  'Ghi lại điểm kết nối cuối cùng và theo dõi di chuyển trong trường hợp khẩn cấp.',
            ),
            const SizedBox(height: AppSpacing.md),
            PermissionCard(
              icon: Icons.notifications_active,
              iconColor: colorScheme.primary,
              iconBackground: colorScheme.surfaceContainer,
              title: 'Thông báo',
              body:
                  'Cảnh báo tức thì nếu bé rời khỏi vùng an toàn hoặc thiết bị mất kết nối.',
            ),
            const SizedBox(height: AppSpacing.md),
            PermissionCard(
              icon: Icons.group,
              iconColor: colorScheme.secondary,
              iconBackground: colorScheme.surfaceContainer,
              title: 'Theo dõi cùng gia đình',
              body:
                  'Mời người thân cùng theo dõi beacon và nhận thông báo khi bé ở gần ai.',
              footnote: 'Đồng bộ an toàn với các thành viên khác.',
            ),
            const SizedBox(height: AppSpacing.md),

            // Privacy note
            Text(
              'Chỉ chia sẻ vị trí gần - không theo dõi GPS trực tiếp',
              textAlign: TextAlign.center,
              style: textTheme.labelSmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Page indicators
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _PageIndicator(color: colorScheme.onSurface),
                  const SizedBox(width: AppSpacing.xs),
                  _PageIndicator(color: colorScheme.surfaceContainerHigh),
                  const SizedBox(width: AppSpacing.xs),
                  _PageIndicator(color: colorScheme.surfaceContainerHigh),
                ],
              ),
              const SizedBox(height: AppSpacing.md),

              // Primary CTA
              // @converge:element navigate:onboarding-next
              FilledButton.icon(
                onPressed: () => context.go('/home'),
                style: FilledButton.styleFrom(
                  backgroundColor: colorScheme.onSurface,
                  foregroundColor: colorScheme.surface,
                  minimumSize: const Size.fromHeight(56),
                  shape: const StadiumBorder(),
                ),
                icon: Text(
                  'Bắt đầu',
                  style: textTheme.labelLarge
                      ?.copyWith(color: colorScheme.surface),
                ),
                label: const Icon(Icons.arrow_forward),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PageIndicator extends StatelessWidget {
  const _PageIndicator({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}
