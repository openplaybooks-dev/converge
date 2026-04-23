import 'package:flutter/material.dart';
import 'widgets/hero_section.dart';
import 'widgets/co_guardian_card.dart';

class BeaconDetailScreen extends StatelessWidget {
  const BeaconDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface.withValues(alpha: 0.8),
        elevation: 0,
        scrolledUnderElevation: 0,
        toolbarHeight: 100,
        leading: IconButton(
// @converge:element BeaconDetailScreen-IconButton-onPressed-1
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back, size: 28),
          color: colorScheme.onSurface,
          padding: EdgeInsets.zero,
        ),
        title: Text(
          'Chi tiết Beacon',
          style: textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -0.02,
            color: colorScheme.onSurface,
          ),
        ),
        actions: [
          IconButton(
// @converge:element BeaconDetailScreen-IconButton-onPressed-2
            onPressed: () => _showMoreMenu(context),
            icon: const Icon(Icons.more_vert, size: 28),
            color: colorScheme.onSurfaceVariant,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 32, 24, 200),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const HeroSection(),
            const SizedBox(height: 32),
            _TechnicalAccordion(colorScheme: colorScheme, textTheme: textTheme),
            const SizedBox(height: 32),
            CoGuardianCard(colorScheme: colorScheme, textTheme: textTheme),
            const SizedBox(height: 32),
            _LeaveGroupSection(colorScheme: colorScheme, textTheme: textTheme),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
// @converge:element BeaconDetailScreen-FloatingActionButton-onPressed-1
        onPressed: () => _showInviteSheet(context),
        backgroundColor: colorScheme.primary,
        foregroundColor: colorScheme.onPrimary,
        elevation: 8,
        child: const Icon(Icons.person_add),
      ),
      bottomNavigationBar: const _BottomNavBar(selectedIndex: 1),
    );
  }
}

class _TechnicalAccordion extends StatelessWidget {
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _TechnicalAccordion({
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.settings_ethernet,
                      size: 24,
                      color: colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Chi tiết kỹ thuật',
                      style: textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                      ),
                    ),
                  ],
                ),
                Icon(Icons.expand_more, size: 24, color: colorScheme.onSurfaceVariant),
              ],
            ),
          ),
          Container(height: 1, color: colorScheme.outlineVariant),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Row(
              children: [
                _TechItem(label: 'UUID', value: 'E2C4...8F91', colorScheme: colorScheme, textTheme: textTheme),
                const SizedBox(width: 16),
                _TechItem(label: 'Major', value: '10001', colorScheme: colorScheme, textTheme: textTheme),
                const SizedBox(width: 16),
                _TechItem(label: 'Minor', value: '20002', colorScheme: colorScheme, textTheme: textTheme),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TechItem extends StatelessWidget {
  final String label;
  final String value;
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _TechItem({
    required this.label,
    required this.value,
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.05,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              value,
              style: textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LeaveGroupSection extends StatelessWidget {
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _LeaveGroupSection({
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 32),
        Center(
          child: Text(
            'Bạn sẽ không nhận thông báo khi bé rời beacon.',
            style: textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () => _confirmLeaveGroup(context),
          style: TextButton.styleFrom(
            foregroundColor: colorScheme.error,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(9999),
              side: BorderSide(color: colorScheme.error, width: 1),
            ),
          ),
          child: Text(
            'Rời nhóm theo dõi',
            style: textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

void _showMoreMenu(BuildContext context) {
  final colorScheme = Theme.of(context).colorScheme;
  showModalBottomSheet(
    context: context,
    builder: (context) => Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.share),
            title: const Text('Chia sẻ beacon'),
            onTap: () => Navigator.pop(context),
          ),
          ListTile(
            leading: const Icon(Icons.edit),
            title: const Text('Đổi tên beacon'),
            onTap: () => Navigator.pop(context),
          ),
          ListTile(
            leading: Icon(Icons.delete, color: colorScheme.error),
            title: Text('Xóa beacon', style: TextStyle(color: colorScheme.error)),
            onTap: () => Navigator.pop(context),
          ),
        ],
      ),
    ),
  );
}

void _showInviteSheet(BuildContext context) {
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Mời người cùng theo dõi')),
  );
}

void _confirmLeaveGroup(BuildContext context) {
  final colorScheme = Theme.of(context).colorScheme;
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Rời nhóm theo dõi?'),
      content: const Text('Bạn sẽ không nhận thông báo khi bé rời beacon này.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Hủy'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Rời nhóm', style: TextStyle(color: colorScheme.error)),
        ),
      ],
    ),
  );
}

class _BottomNavBar extends StatelessWidget {
  final int selectedIndex;

  const _BottomNavBar({required this.selectedIndex});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.9),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.05),
            blurRadius: 32,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: SafeArea(
        child: Container(
          height: 80,
          padding: const EdgeInsets.symmetric(horizontal: 16),
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
                icon: Icons.devices,
                label: 'Thiết bị',
                isSelected: true,
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
                icon: Icons.settings_outlined,
                label: 'Cài đặt',
                isSelected: false,
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
        ? colorScheme.primary
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