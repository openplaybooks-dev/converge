import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/guardian_card.dart';
import 'widgets/invite_guardian_button.dart';

class GuardiansScreen extends StatelessWidget {
  const GuardiansScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: AppTheme.brandSurface,
      appBar: AppBar(
        backgroundColor: AppTheme.brandSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        toolbarHeight: 72,
        leading: IconButton(
// @converge:element GuardiansScreen-IconButton-onPressed-1
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back, color: AppTheme.brandOnSurface),
          tooltip: 'Back',
        ),
        title: Text(
          'Người cùng theo dõi',
          style: textTheme.titleLarge?.copyWith(
            color: AppTheme.brandOnSurface,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.02,
          ),
        ),
        actions: [
          IconButton(
// @converge:element GuardiansScreen-IconButton-onPressed-2
            onPressed: () => showModalBottomSheet(
              context: context,
              builder: (_) => const SizedBox(height: 300),
            ),
            icon: const Icon(Icons.person_add, color: AppTheme.brandOnSurface),
            tooltip: 'Add guardian',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
            horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceSm),
        child: Column(
          children: [
            const SizedBox(height: AppTheme.spaceSm),
            // Guardian Cards
            GuardianCard(
              initial: 'M',
              name: 'Mẹ',
              role: 'Chủ sở hữu',
              roleColor: AppTheme.brandGreenLight,
              roleTextColor: AppTheme.brandGreenDark,
              status: 'Đang gần',
              statusBgColor: AppTheme.brandGreenLight,
              statusTextColor: AppTheme.brandGreenDark,
              avatarBgColor: AppTheme.brandGreenLight,
              avatarTextColor: AppTheme.brandGreenDark,
              isOnline: true,
            ),
            const SizedBox(height: AppTheme.spaceMd),
            GuardianCard(
              initial: 'B',
              name: 'Bố',
              role: 'Người theo dõi',
              roleColor: AppTheme.brandBorder,
              roleTextColor: AppTheme.brandOnSurfaceVariant,
              status: 'Xa beacon',
              statusBgColor: AppTheme.brandSurfaceContainer,
              statusTextColor: AppTheme.brandGreen,
              avatarBgColor: AppTheme.brandSurfaceContainer,
              avatarTextColor: AppTheme.brandGreen,
              isOnline: false,
            ),
            const SizedBox(height: AppTheme.spaceMd),
            GuardianCard(
              initial: 'B',
              name: 'Bà Nội',
              role: 'Người theo dõi',
              roleColor: AppTheme.brandBorder,
              roleTextColor: AppTheme.brandOnSurfaceVariant,
              status: 'Ngoại tuyến',
              statusBgColor: AppTheme.brandBorder,
              statusTextColor: AppTheme.brandOnSurfaceVariant,
              avatarBgColor: AppTheme.brandSurfaceContainer,
              avatarTextColor: AppTheme.brandOnSurfaceVariant,
              isOnline: false,
            ),
            const SizedBox(height: AppTheme.spaceXl),
            // Invite Section
            const InviteGuardianButton(),
            const SizedBox(height: 12),
            Text(
              'Chia sẻ qua mã QR hoặc liên kết mời',
              style: textTheme.bodySmall?.copyWith(
                color: AppTheme.brandOnSurfaceVariant,
              ),
            ),
            const SizedBox(height: 120),
          ],
        ),
      ),
    );
  }
}
