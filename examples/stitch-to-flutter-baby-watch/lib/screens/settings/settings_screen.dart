import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/overlays/timeout_picker/timeout_picker.dart';
import 'widgets/beacon_setup_card.dart';
import '../../widgets/mute_notifications_row.dart';
import 'package:folio/widgets/general_settings_section.dart';
import 'widgets/profile_card.dart';

/// Settings screen - configure alert behavior, timeout, and app preferences
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

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
        toolbarHeight: 72,
        leading: IconButton(
// @converge:element SettingsScreen-IconButton-onPressed-1
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back),
          color: colorScheme.onSurface,
        ),
        title: Text(
          'Settings',
          style: textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurface,
          ),
        ),
        actions: [
          IconButton(
// @converge:element SettingsScreen-IconButton-onPressed-2
            onPressed: () => showModalBottomSheet(
              context: context,
              builder: (_) => const SizedBox(height: 200),
            ),
            icon: const Icon(Icons.more_vert),
            color: colorScheme.onSurface,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppTheme.spaceMd),
            // Profile Section
            const ProfileCard(),
            const SizedBox(height: AppTheme.spaceXl),
            // Alert Settings
            _SectionLabel(label: 'Alert Settings'),
            const SizedBox(height: AppTheme.spaceMd),
            Container(
              padding: const EdgeInsets.all(AppTheme.spaceLg),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainer,
                borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.brandShadow,
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'TIMEOUT INTERVAL',
                            style: textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.05,
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.brandGreenLight,
                              borderRadius:
                                  BorderRadius.circular(AppTheme.radiusFull),
                            ),
                            child: Text(
                              'Recommended',
                              style: textTheme.labelSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: AppTheme.brandGreen,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () async {
                                final result = await showModalBottomSheet<int>(
                                  context: context,
                                  isScrollControlled: true,
                                  builder: (_) => const TimeoutPicker(),
                                );
                                if (result != null && context.mounted) {
                                  // Handle result
                                }
                              },
                              child: _TimeoutButton(
                                label: '2 min',
                                isSelected: true,
                                colorScheme: colorScheme,
                                textTheme: textTheme,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _TimeoutButton(
                              label: '5 min',
                              isSelected: false,
                              colorScheme: colorScheme,
                              textTheme: textTheme,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _TimeoutButton(
                              label: '10 min',
                              isSelected: false,
                              colorScheme: colorScheme,
                              textTheme: textTheme,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  _ToggleRow(
                    icon: Icons.volume_up,
                    label: 'Audio Alert',
                    isOn: true,
                    colorScheme: colorScheme,
                    textTheme: textTheme,
                  ),
                  const SizedBox(height: AppTheme.spaceMd),
                  _ToggleRow(
                    icon: Icons.vibration,
                    label: 'Vibration',
                    isOn: true,
                    colorScheme: colorScheme,
                    textTheme: textTheme,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTheme.radiusLg),
            // Beacon Setup
            _SectionLabel(label: 'Beacon Setup'),
            const SizedBox(height: AppTheme.spaceMd),
            const BeaconSetupCard(),
            const SizedBox(height: AppTheme.radiusLg),
            // Mute Notifications
            const MuteNotificationsRow(),
            const SizedBox(height: AppTheme.radiusLg),
            // General Section
            _SectionLabel(label: 'General'),
            const SizedBox(height: AppTheme.spaceMd),
            const GeneralSettingsSection(),
            const SizedBox(height: AppTheme.radiusLg),
            // Sign Out
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
// @converge:element SettingsScreen-ElevatedButton-onPressed-1
                onPressed: () => throw UnimplementedError(),
                icon: const Icon(Icons.logout),
                label: const Text('Sign Out'),
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      AppTheme.signOutBackground.withValues(alpha: 0.1),
                  foregroundColor: AppTheme.signOutForeground,
                  padding:
                      const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  static Widget _buildBottomNav(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.9),
        boxShadow: [
          BoxShadow(
            color: AppTheme.brandShadowDark,
            blurRadius: 32,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: SafeArea(
        child: Container(
          height: 80,
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceMd),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(
                icon: Icons.home_outlined,
                label: 'Trang chủ',
                isSelected: false,
                colorScheme: colorScheme,
                textTheme: textTheme,
              ),
              _NavItem(
                icon: Icons.devices_outlined,
                label: 'Thiết bị',
                isSelected: false,
                colorScheme: colorScheme,
                textTheme: textTheme,
              ),
              _NavItem(
                icon: Icons.security_outlined,
                label: 'An toàn',
                isSelected: false,
                colorScheme: colorScheme,
                textTheme: textTheme,
              ),
              _NavItem(
                icon: Icons.settings,
                label: 'Cài đặt',
                isSelected: true,
                colorScheme: colorScheme,
                textTheme: textTheme,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    final color = isSelected
        ? colorScheme.onSurfaceVariant
        : colorScheme.onSurfaceVariant.withValues(alpha: 0.6);
    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 26, color: color),
        const SizedBox(height: 4),
        Text(
          label,
          style: textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;

  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: Text(
        label,
        style: textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: 0.1,
          color: colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

class _TimeoutButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _TimeoutButton({
    required this.label,
    required this.isSelected,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: isSelected ? colorScheme.surfaceContainer : AppTheme.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: colorScheme.shadow.withValues(alpha: 0.05),
                  blurRadius: 2,
                  offset: const Offset(0, 1),
                ),
              ]
            : null,
      ),
      child: Center(
        child: Text(
          label,
          style: textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: isSelected
                ? colorScheme.onSurface
                : colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isOn;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _ToggleRow({
    required this.icon,
    required this.label,
    required this.isOn,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.brandSurfaceContainer,
              ),
              child: Icon(icon, color: colorScheme.onSurfaceVariant, size: 20),
            ),
            const SizedBox(width: AppTheme.spaceMd),
            Text(
              label,
              style: textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
          ],
        ),
        Container(
          width: 48,
          height: 24,
          decoration: BoxDecoration(
            color: colorScheme.onSurface,
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          ),
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Container(
            width: 16,
            height: 16,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: colorScheme.surface,
            ),
          ),
        ),
      ],
    );
  }
}
