import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_spacing.dart';
import '../../widgets/app_bottom_nav_bar.dart';
// ignore: unused_import
import 'history_states.dart';
import 'widgets/history_event_card.dart';
import 'widgets/history_filter_pill.dart';

// Wired via alertEventsProvider + historyFilterProvider; filter pills update
// the filter and the list re-filters by occurred_at.

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  static const _filters = ['Today', 'Yesterday', 'Last 7 Days'];
  int _selectedFilter = 0;

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
        leadingWidth: 56,
        leading: Padding(
          padding: const EdgeInsets.only(left: AppSpacing.md),
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: colorScheme.surfaceContainerHigh,
                width: 2,
              ),
            ),
            child: const CircleAvatar(
              radius: 18,
              backgroundImage: CachedNetworkImageProvider(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuAmcp_DK21b9oaJBBfn1A5_exPcpYHVrfRsyoO8bu2XA6wHA1XVV_GNNXA8LZ53cG-0OptNKyLs5Ux-MP2Rd_lwuOtgj-2fcMbzjYIcmTqR9cCBFyhYgnAEKwUSiuMBFwmqTg7NW9OsBFk57iODLQYHPYV0zE8uEvDvOL7XKY91KN53AzfLyEu0w-rcR5B_XyJwnXeukynCkTZ3eEGkmlUSIzjgctgq3jjsN07Ws1KhP5_-w6z-F1gPg1mrq86OsfVxiv0qVYE2vhKq',
              ),
            ),
          ),
        ),
        title: Text(
          'History',
          style: textTheme.headlineSmall?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w800,
          ),
        ),
        actions: [
          // @converge:element action:open-search
          IconButton(
            icon: const Icon(Icons.search),
            color: colorScheme.onSurface,
            tooltip: 'Tìm kiếm',
            onPressed: () {
              showModalBottomSheet<void>(
                context: context,
                builder: (_) => const Placeholder(),
              );
            },
          ),
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
            // Filter bar
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
              child: Row(
                // @converge:element action:filter-today
                // @converge:element action:filter-yesterday
                // @converge:element action:filter-7-days
                children: [
                  for (var i = 0; i < _filters.length; i++) ...[
                    HistoryFilterPill(
                      label: _filters[i],
                      isSelected: _selectedFilter == i,
                      onTap: () {
                        setState(() => _selectedFilter = i);
                      },
                    ),
                    if (i != _filters.length - 1)
                      const SizedBox(width: AppSpacing.sm),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Event list
            // @converge:element navigate:event-detail
            const HistoryEventCard(
              kind: HistoryEventKind.alert,
              eventLabel: 'Alert Event',
              title: 'Left Safe Zone',
              badgeLabel: 'Alert',
              badgeIcon: Icons.warning_rounded,
              childName: 'Bé Na',
              timeIcon: Icons.schedule,
              timeLabel: '10:24 AM  •  4m duration',
              statusLabel: 'Left Safe Zone',
            ),
            const SizedBox(height: AppSpacing.md),
            // @converge:element navigate:event-detail
            const HistoryEventCard(
              kind: HistoryEventKind.safe,
              eventLabel: 'Safe Event',
              title: 'Back Home',
              badgeLabel: 'Safe',
              badgeIcon: Icons.verified_user,
              childName: 'Bé Na',
              timeIcon: Icons.schedule,
              timeLabel: '09:15 AM',
              statusLabel: 'Back Home',
            ),
            const SizedBox(height: AppSpacing.md),
            // @converge:element navigate:event-detail
            const HistoryEventCard(
              kind: HistoryEventKind.offline,
              eventLabel: 'Alert Event',
              title: 'Connection Lost',
              badgeLabel: 'Offline',
              badgeIcon: Icons.link_off,
              childName: 'Bé Na',
              timeIcon: Icons.history,
              timeLabel: 'Yesterday, 6:30 PM',
              statusLabel: 'Connection Lost',
            ),
            const SizedBox(height: AppSpacing.xl),

            // Utility buttons
            // @converge:element action:export-logs
            SizedBox(
              height: 56,
              child: FilledButton.tonalIcon(
                onPressed: () {
                  showModalBottomSheet<void>(
                    context: context,
                    builder: (_) => const Placeholder(),
                  );
                },
                style: FilledButton.styleFrom(
                  backgroundColor: colorScheme.surfaceContainerHigh,
                  foregroundColor: colorScheme.onSurface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                ),
                icon: const Icon(Icons.ios_share),
                label: Text(
                  'Export Logs',
                  style: textTheme.labelLarge?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            // @converge:element action:clear-history
            Center(
              child: TextButton(
                onPressed: () {
                  showDialog<void>(
                    context: context,
                    builder: (_) => const AlertDialog(
                      title: Text('Clear History'),
                      content: Text(
                        'Are you sure you want to clear all history?',
                      ),
                    ),
                  );
                },
                style: TextButton.styleFrom(
                  foregroundColor: colorScheme.onSurfaceVariant,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm + 4,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                ),
                child: Text(
                  'Clear History',
                  style: textTheme.labelLarge?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
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
