import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_spacing.dart';
import '../../widgets/app_bottom_nav_bar.dart';
// ignore: unused_import
import 'settings_states.dart';

// Wired via alertConfigsProvider; toggle-* and set-timeout-* markers route to
// matching AlertConfigs mutators with shared_preferences persistence.

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  static const _timeoutOptions = ['2 min', '5 min', '10 min'];
  static const _muteOptions = ['5 min', '10 min', '15 min'];

  int _selectedTimeout = 0;
  int _selectedMute = 0;
  bool _audioAlert = true;
  bool _vibration = true;
  bool _doNotDisturb = false;
  double _rssiThreshold = 0.65;

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
        titleSpacing: AppSpacing.sm,
        // @converge:element navigate:back
        leading: IconButton(
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
          'Settings',
          style: textTheme.titleLarge?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w800,
          ),
        ),
        actions: [
          // @converge:element action:open-menu
          IconButton(
            icon: const Icon(Icons.more_vert),
            color: colorScheme.onSurface,
            tooltip: 'Thêm',
            onPressed: () {
              showModalBottomSheet<void>(
                context: context,
                builder: (_) => const Placeholder(),
              );
            },
          ),
          const SizedBox(width: AppSpacing.xs),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          // Leave space for the bottom nav.
          120,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _ProfileSection(
              name: 'Elena Fisher',
              plan: 'Premium Guardian Plan',
              avatarUrl:
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuBsLPSB-Y4PKqmxKLnzl_Oz1Jcp1b90EeEXmmhjZr2ryUG8Krp3EWgvr7hIjHFuFEjfaU1AgFrHNFf4BQFalrzBsA1uYgbeK45k94lcJjbMkvuHf4KamJtzzYGE0MC-GX5CsFJw_HJwG6VTuKLvHCdRMshbwbzVG7Z-nptdTJBURI5u8l0YqITxsCdf1_aXOn2IqXvOBa24XsK5vVsFjvytiT9yFDcPWR5BwMU8jky2CTgf_Id4VF4tf4Si6-EF_h6kFXQ0y8YjtugW',
            ),
            const SizedBox(height: AppSpacing.xl),

            const _SectionLabel('Alert Settings'),
            const SizedBox(height: AppSpacing.sm),
            _SettingsCard(
              children: [
                _TimeoutSection(
                  options: _timeoutOptions,
                  selected: _selectedTimeout,
                  onSelected: (i) => setState(() => _selectedTimeout = i),
                ),
                const SizedBox(height: AppSpacing.lg),
                // @converge:element action:toggle-audio-alert
                _ToggleRow(
                  icon: Icons.volume_up,
                  label: 'Audio Alert',
                  value: _audioAlert,
                  onChanged: (v) => setState(() => _audioAlert = v),
                ),
                const SizedBox(height: AppSpacing.md),
                // @converge:element action:toggle-vibration
                _ToggleRow(
                  icon: Icons.vibration,
                  label: 'Vibration',
                  value: _vibration,
                  onChanged: (v) => setState(() => _vibration = v),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),

            const _SectionLabel('Beacon Setup'),
            const SizedBox(height: AppSpacing.sm),
            _SettingsCard(
              children: [
                _RssiThresholdSection(
                  value: _rssiThreshold,
                  onChanged: (v) => setState(() => _rssiThreshold = v),
                ),
                const SizedBox(height: AppSpacing.md),
                // @converge:element action:open-scan-interval
                _ScanIntervalRow(
                  intervalLabel: '15 seconds',
                  onTap: () {
                    showModalBottomSheet<void>(
                      context: context,
                      builder: (_) => const Placeholder(),
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),

            const _SectionLabel('Mute Notifications'),
            const SizedBox(height: AppSpacing.sm),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
              child: Row(
                children: [
                  // @converge:element action:mute-5
                  _MuteChip(
                    label: _muteOptions[0],
                    isSelected: _selectedMute == 0,
                    onTap: () => setState(() => _selectedMute = 0),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  // @converge:element action:mute-10
                  _MuteChip(
                    label: _muteOptions[1],
                    isSelected: _selectedMute == 1,
                    onTap: () => setState(() => _selectedMute = 1),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  // @converge:element action:mute-15
                  _MuteChip(
                    label: _muteOptions[2],
                    isSelected: _selectedMute == 2,
                    onTap: () => setState(() => _selectedMute = 2),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            const _SectionLabel('General'),
            const SizedBox(height: AppSpacing.sm),
            _SettingsCard(
              padding: const EdgeInsets.all(AppSpacing.xs),
              children: [
                // @converge:element navigate:system-permissions
                _PermissionsRow(
                  onTap: () {
                    showModalBottomSheet<void>(
                      context: context,
                      builder: (_) => const Placeholder(),
                    );
                  },
                ),
                // @converge:element action:toggle-dnd
                _DndRow(
                  value: _doNotDisturb,
                  onChanged: (v) => setState(() => _doNotDisturb = v),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),

            // @converge:element action:sign-out
            _SignOutButton(
              onPressed: () {
                showDialog<void>(
                  context: context,
                  builder: (_) => const AlertDialog(
                    title: Text('Sign out?'),
                  ),
                );
              },
            ),
          ],
        ),
      ),
      // @converge:element navigate:home
      // @converge:element navigate:devices
      // @converge:element navigate:safety
      // @converge:element navigate:settings
      bottomNavigationBar: const AppBottomNavBar(),
    );
  }
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({
    required this.name,
    required this.plan,
    required this.avatarUrl,
  });

  final String name;
  final String plan;
  final String avatarUrl;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Row(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(
                  color: colorScheme.surfaceContainerLowest,
                  width: 4,
                ),
                boxShadow: const [AppShadows.soft],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.md - 4),
                child: CachedNetworkImage(
                  imageUrl: avatarUrl,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Positioned(
              right: -4,
              bottom: -4,
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: colorScheme.onSurface,
                  shape: BoxShape.circle,
                  boxShadow: const [AppShadows.soft],
                ),
                child: Icon(
                  Icons.verified,
                  size: 16,
                  color: colorScheme.surface,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: textTheme.headlineSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.workspace_premium,
                    size: 16,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: AppSpacing.xs + 2),
                  Flexible(
                    child: Text(
                      plan,
                      style: textTheme.labelMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(left: AppSpacing.sm),
      child: Text(
        label.toUpperCase(),
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({
    required this.children,
    this.padding = const EdgeInsets.all(AppSpacing.md),
  });

  final List<Widget> children;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: const [AppShadows.soft],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    );
  }
}

class _TimeoutSection extends StatelessWidget {
  const _TimeoutSection({
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  final List<String> options;
  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'TIMEOUT INTERVAL',
              style: textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: colorScheme.tertiaryContainer,
                borderRadius: BorderRadius.circular(AppRadius.full),
              ),
              child: Text(
                'Recommended',
                style: textTheme.labelSmall?.copyWith(
                  color: colorScheme.tertiary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm + 4),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainer,
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
          child: Row(
            children: [
              // @converge:element action:set-timeout-2
              Expanded(
                child: _SegmentedButton(
                  label: options[0],
                  isSelected: selected == 0,
                  onTap: () => onSelected(0),
                ),
              ),
              // @converge:element action:set-timeout-5
              Expanded(
                child: _SegmentedButton(
                  label: options[1],
                  isSelected: selected == 1,
                  onTap: () => onSelected(1),
                ),
              ),
              // @converge:element action:set-timeout-10
              Expanded(
                child: _SegmentedButton(
                  label: options[2],
                  isSelected: selected == 2,
                  onTap: () => onSelected(2),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SegmentedButton extends StatelessWidget {
  const _SegmentedButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.full),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? colorScheme.surfaceContainerLowest : null,
          borderRadius: BorderRadius.circular(AppRadius.full),
          boxShadow: isSelected ? const [AppShadows.soft] : null,
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: isSelected
                ? colorScheme.onSurface
                : colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  const _ToggleRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: () => onChanged(!value),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 20, color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(width: AppSpacing.md - 8),
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            _ToggleChip(value: value),
          ],
        ),
      ),
    );
  }
}

class _ToggleChip extends StatelessWidget {
  const _ToggleChip({required this.value});

  final bool value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final background =
        value ? colorScheme.onSurface : colorScheme.surfaceContainerHighest;
    final foreground =
        value ? colorScheme.surface : colorScheme.onSurfaceVariant;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm + 4,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        value ? 'On' : 'Off',
        style: theme.textTheme.labelSmall?.copyWith(
          color: foreground,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _RssiThresholdSection extends StatelessWidget {
  const _RssiThresholdSection({
    required this.value,
    required this.onChanged,
  });

  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    // Map slider value (0..1) to dBm range (-95 to -45).
    final dbm = (-95 + (value * 50)).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'RSSI THRESHOLD',
              style: textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
            Text(
              '$dbm dBm',
              style: textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        // @converge:element action:adjust-rssi
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 8,
            activeTrackColor: colorScheme.onSurface,
            inactiveTrackColor: colorScheme.surfaceContainer,
            thumbColor: colorScheme.onSurface,
            overlayColor: colorScheme.onSurface.withValues(alpha: 0.08),
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 16),
          ),
          child: Slider(value: value, onChanged: onChanged),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Adjust the sensitivity of proximity detection. A lower dBm value requires the device to be closer.',
          style: textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}

class _ScanIntervalRow extends StatelessWidget {
  const _ScanIntervalRow({
    required this.intervalLabel,
    required this.onTap,
  });

  final String intervalLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm + 4),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            Icon(
              Icons.history_toggle_off,
              color: colorScheme.onSurfaceVariant,
              size: 22,
            ),
            const SizedBox(width: AppSpacing.sm + 4),
            Expanded(
              child: Text(
                'SCAN INTERVAL',
                style: textTheme.titleSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Text(
              intervalLabel,
              style: textTheme.labelLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.unfold_more,
              size: 18,
              color: colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}

class _MuteChip extends StatelessWidget {
  const _MuteChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final background =
        isSelected ? colorScheme.onSurface : colorScheme.surfaceContainerHigh;
    final foreground =
        isSelected ? colorScheme.surface : colorScheme.onSurfaceVariant;

    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.full),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md - 4,
          vertical: AppSpacing.sm + 4,
        ),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(AppRadius.full),
          boxShadow: isSelected ? const [AppShadows.soft] : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.schedule, size: 16, color: foreground),
            const SizedBox(width: 6),
            Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(
                color: foreground,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PermissionsRow extends StatelessWidget {
  const _PermissionsRow({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md - 8),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.security,
                size: 20,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(width: AppSpacing.md - 8),
            Expanded(
              child: Text(
                'System Permissions',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}

class _DndRow extends StatelessWidget {
  const _DndRow({required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: () => onChanged(!value),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md - 8),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.do_not_disturb_on,
                size: 20,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(width: AppSpacing.md - 8),
            Expanded(
              child: Text(
                'Do Not Disturb',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            _ToggleChip(value: value),
          ],
        ),
      ),
    );
  }
}

class _SignOutButton extends StatelessWidget {
  const _SignOutButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return SizedBox(
      height: 56,
      child: FilledButton.icon(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: colorScheme.errorContainer,
          foregroundColor: colorScheme.error,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
        ),
        icon: const Icon(Icons.logout),
        label: Text(
          'Sign Out',
          style: theme.textTheme.labelLarge?.copyWith(
            color: colorScheme.error,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
