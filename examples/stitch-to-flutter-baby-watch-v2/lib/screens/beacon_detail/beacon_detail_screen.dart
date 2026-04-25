import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_spacing.dart';
import 'package:baby_watch/widgets/beacon_detail_bottom_nav.dart';
import 'widgets/beacon_hero_header.dart';
import 'widgets/beacon_leave_group_banner.dart';
import 'widgets/beacon_technical_details_card.dart';
import 'widgets/followers_monitoring_card.dart';

class BeaconDetailScreen extends ConsumerWidget {
  const BeaconDetailScreen({super.key});

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
        titleSpacing: AppSpacing.md,
        leading:
            // @converge:element action:go-back
            IconButton(
          icon: const Icon(Icons.arrow_back),
          color: colorScheme.primary,
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
          'Beacon Detail',
          style: textTheme.titleLarge?.copyWith(color: colorScheme.primary),
        ),
        actions: [
          // @converge:element action:open-menu
          IconButton(
            icon: const Icon(Icons.more_vert),
            color: colorScheme.primary,
            tooltip: 'Tùy chọn',
            onPressed: () {
              showModalBottomSheet<void>(
                context: context,
                builder: (_) => const Placeholder(),
              );
            },
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
            // Hero section
            const BeaconHeroHeader(),
            const SizedBox(height: AppSpacing.lg),

            // Technical accordion card
            const BeaconTechnicalDetailsCard(),
            const SizedBox(height: AppSpacing.lg),

            // Monitoring list card
            const FollowersMonitoringCard(),
            const SizedBox(height: AppSpacing.lg),

            // Decorative & secondary actions
            const BeaconLeaveGroupBanner(),
          ],
        ),
      ),
      bottomNavigationBar: const BeaconDetailBottomNav(),
    );
  }
}
