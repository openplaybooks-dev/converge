import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:folio/theme/app_theme.dart';
import 'package:folio/screens/history/widgets/event_card.dart';
import 'package:folio/widgets/filter_chip.dart';
import 'package:folio/screens/history/widgets/nav_item.dart';
import 'package:folio/widgets/overlays/filter_date/filter_date.dart';
import 'package:folio/widgets/overlays/event_detail/event_detail.dart';

/// History screen - chronological log of disconnection/reconnection events
class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

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
        toolbarHeight: 80,
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.brandShadow,
                    blurRadius: 2,
                    offset: Offset(0, 1),
                  ),
                ],
              ),
              child: ClipOval(
                child: Image.network(
                  'https://picsum.photos/seed/profile4/100/100',
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(width: AppTheme.spaceMd),
            Text(
              'History',
              style: textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                letterSpacing: -0.02,
                color: AppTheme.brandOnSurface,
              ),
            ),
            const SizedBox(width: AppTheme.spaceMd),
            IconButton(
// @converge:element HistoryScreen-IconButton-onPressed-1
              onPressed: () async {
                final result = await showModalBottomSheet<DateRange>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => const FilterDate(),
                );
                if (result != null && context.mounted) {
                  // Handle date range result
                }
              },
              icon: const Icon(Icons.search),
              color: AppTheme.brandOnSurface,
            ),
          ],
        ),
        actions: [
          IconButton(
// @converge:element HistoryScreen-IconButton-onPressed-2
            onPressed: () => showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              builder: (_) => const EventDetail(),
            ),
            icon: const Icon(Icons.more_vert),
            color: AppTheme.brandOnSurface,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppTheme.spaceXs),
            // Filter Bar
            const SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  HistoryFilterChip(label: 'Today', isSelected: true),
                  SizedBox(width: AppTheme.spaceSm),
                  HistoryFilterChip(label: 'Yesterday', isSelected: false),
                  SizedBox(width: AppTheme.spaceSm),
                  HistoryFilterChip(label: 'Last 7 Days', isSelected: false),
                ],
              ),
            ),
            const SizedBox(height: 40),
            // Event List
            const EventCard(
              category: 'Alert Event',
              title: 'Left Safe Zone',
              icon: Icons.warning,
              iconFilled: true,
              badgeLabel: 'Alert',
              badgeColor: AppTheme.signOutForeground,
              backgroundColor: Color(0xFFfff1ed),
              iconColor: AppTheme.signOutForeground,
              childName: 'Bé Na',
              time: '10:24 AM • 4m duration',
              eventLabel: 'Left Safe Zone',
              eventLabelColor: AppTheme.signOutForeground,
            ),
            const SizedBox(height: AppTheme.spaceLg),
            const EventCard(
              category: 'Safe Event',
              title: 'Back Home',
              icon: Icons.verified_user,
              iconFilled: true,
              badgeLabel: 'Safe',
              badgeColor: AppTheme.brandGreen,
              backgroundColor: AppTheme.brandGreenLight,
              iconColor: AppTheme.brandGreen,
              childName: 'Bé Na',
              time: '09:15 AM',
              eventLabel: 'Back Home',
              eventLabelColor: AppTheme.brandGreen,
            ),
            const SizedBox(height: AppTheme.spaceLg),
            const EventCard(
              category: 'Alert Event',
              title: 'Connection Lost',
              icon: Icons.link_off,
              iconFilled: false,
              badgeLabel: 'Offline',
              badgeColor: AppTheme.signOutForeground,
              backgroundColor: Color(0xFFfff1ed),
              iconColor: AppTheme.signOutForeground,
              childName: 'Bé Na',
              time: 'Yesterday, 6:30 PM',
              eventLabel: 'Connection Lost',
              eventLabelColor: AppTheme.signOutForeground,
            ),
            // Utility Buttons
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
// @converge:element HistoryScreen-ElevatedButton-onPressed-1
                onPressed: () {
                  Share.share('History logs export coming soon');
                },
                icon: const Icon(Icons.ios_share),
                label: const Text('Export Logs'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.brandSurfaceContainer,
                  foregroundColor: AppTheme.brandOnSurface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppTheme.spaceMd),
            Center(
              child: TextButton(
// @converge:element HistoryScreen-TextButton-onPressed-1
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Clear History'),
                      content: const Text('Are you sure you want to clear all history?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.pop(ctx);
                          },
                          child: const Text('Clear'),
                        ),
                      ],
                    ),
                  );
                },
                child: Text(
                  'Clear History',
                  style: textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w500,
                    color: AppTheme.brandOnSurfaceVariant,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(colorScheme),
    );
  }

  static Widget _buildBottomNav(ColorScheme colorScheme) {
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.9),
        boxShadow: const [
          BoxShadow(
            color: AppTheme.brandShadowDark,
            blurRadius: 32,
            offset: Offset(0, -8),
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
              NavItem(
                icon: Icons.home_outlined,
                label: 'Trang chủ',
                isSelected: false,
                colorScheme: colorScheme,
              ),
              NavItem(
                icon: Icons.devices_outlined,
                label: 'Thiết bị',
                isSelected: false,
                colorScheme: colorScheme,
              ),
              NavItem(
                icon: Icons.security_outlined,
                label: 'An toàn',
                isSelected: false,
                colorScheme: colorScheme,
              ),
              NavItem(
                icon: Icons.settings_outlined,
                label: 'Cài đặt',
                isSelected: false,
                colorScheme: colorScheme,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
