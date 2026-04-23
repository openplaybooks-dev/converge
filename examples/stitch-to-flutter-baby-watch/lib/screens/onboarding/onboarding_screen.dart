import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'widgets/hero_illustration.dart';
import 'widgets/page_indicator.dart';
import 'package:folio/widgets/permission_card.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        toolbarHeight: 80,
        leading: IconButton(
// @converge:element OnboardingScreen-IconButton-onPressed-1
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: colorScheme.onSurface),
          tooltip: 'Back',
        ),
        title: Text(
          'BabyGuard',
          style: textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
// @converge:element OnboardingScreen-TextButton-onPressed-1
            onPressed: () => context.go('/'),
            child: Text(
              'Bỏ qua',
              style: textTheme.labelLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          children: [
            const SizedBox(height: 32),
            const HeroIllustration(),
            const SizedBox(height: 40),
            // Headline & Copy
            Column(
              children: [
                Text(
                  'Chào mừng đến với BabyGuard',
                  textAlign: TextAlign.center,
                  style: textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Sử dụng công nghệ Bluetooth năng lượng thấp để đảm bảo bé luôn nằm trong tầm kiểm soát của bạn.',
                  textAlign: TextAlign.center,
                  style: textTheme.bodyLarge?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                    height: 1.6,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 48),
            // Permission Cards
            PermissionCard(
              icon: Icons.bluetooth,
              iconBgColor: colorScheme.secondaryContainer,
              iconColor: colorScheme.onSecondaryContainer,
              title: 'Bluetooth',
              description:
                  'Kết nối liên tục với thiết bị đeo của bé để phát hiện khoảng cách an toàn.',
            ),
            const SizedBox(height: 24),
            PermissionCard(
              icon: Icons.location_on,
              iconBgColor: colorScheme.surfaceContainerHighest,
              iconColor: colorScheme.onSurfaceVariant,
              title: 'Vị trí',
              description:
                  'Ghi lại điểm kết nối cuối cùng và theo dõi di chuyển trong trường hợp khẩn cấp.',
            ),
            const SizedBox(height: 24),
            PermissionCard(
              icon: Icons.notifications_active,
              iconBgColor: colorScheme.surfaceContainerHighest,
              iconColor: colorScheme.onSurfaceVariant,
              title: 'Thông báo',
              description:
                  'Cảnh báo tức thì nếu bé rời khỏi vùng an toàn hoặc thiết bị mất kết nối.',
            ),
            const SizedBox(height: 24),
            PermissionCard(
              icon: Icons.group,
              iconBgColor: colorScheme.surfaceContainerHighest,
              iconColor: colorScheme.onSurfaceVariant,
              title: 'Theo dõi cùng gia đình',
              description:
                  'Mời người thân cùng theo dõi beacon và nhận thông báo khi bé ở gần ai.',
              footnote: 'Đồng bộ an toàn với các thành viên khác.',
            ),
            const SizedBox(height: 24),
            // Privacy Note
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'Chỉ chia sẻ vị trí gần - không theo dõi GPS trực tiếp',
                textAlign: TextAlign.center,
                style: textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            const SizedBox(height: 200),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              colorScheme.surface.withAlpha(0),
              colorScheme.surface,
              colorScheme.surface,
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(32, 0, 32, 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Page Indicators
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    PageIndicator(isActive: true, colorScheme: colorScheme),
                    const SizedBox(width: 8),
                    PageIndicator(isActive: false, colorScheme: colorScheme),
                    const SizedBox(width: 8),
                    PageIndicator(isActive: false, colorScheme: colorScheme),
                  ],
                ),
                const SizedBox(height: 24),
                // Primary CTA
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    // @converge:element OnboardingScreen-ElevatedButton-onPressed-1
                    onPressed: () => context.go('/home'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.onSurface,
                      foregroundColor: colorScheme.surface,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(9999),
                      ),
                      elevation: 4,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Bắt đầu',
                          style: textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: colorScheme.surface,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward, size: 20),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
