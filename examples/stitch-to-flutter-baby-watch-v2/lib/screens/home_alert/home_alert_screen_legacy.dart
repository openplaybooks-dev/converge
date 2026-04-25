import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_spacing.dart';
import 'widgets/alert_action_buttons.dart';
import 'widgets/alert_map_card.dart';
import 'widgets/alert_status_pill.dart';
import 'widgets/beacon_info_card.dart';
import 'package:baby_watch/widgets/bottom_nav_bar.dart';

class HomeAlertScreen extends ConsumerWidget {
  const HomeAlertScreen({super.key});

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
            // @converge:element action:open-menu
            IconButton(
          icon: Icon(Icons.menu, color: colorScheme.onSurface),
          tooltip: 'Menu',
          onPressed: () {
            showModalBottomSheet<void>(
              context: context,
              builder: (_) => const Placeholder(),
            );
          },
        ),
        title: Text(
          'BabyGuard',
          style: textTheme.titleLarge?.copyWith(color: colorScheme.onSurface),
        ),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: AppSpacing.md),
            child: CircleAvatar(
              radius: 20,
              backgroundImage: CachedNetworkImageProvider(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuCnhvFzKXNqs5-9Js9xwXsQlKmzsROGXppOlopaTA9DXVye_e50XcJOvCZ6W000U0aZMoBe3tA4dUPHA8BQ-VSYdybdxx2V9MYz2OSZCWeR9FJ0brT3UC07IVjxFqNyh5conP50CnOtW1YrW63jkV5DWkj2A4RBBzYWdVgI45jaraFlGPkVi0Y8CMIl7bW2ORrMTd3EqQzk6eTuUXXTJpwSvMkqfRMGrtn1w3fbpz6drS9u85F7GREX0OGgpA_rjDsd_ExafkULAnqo',
              ),
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
            // Status pill
            const AlertStatusPill(),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Kiểm tra ngay',
              style: textTheme.headlineLarge
                  ?.copyWith(color: colorScheme.onSurface),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Mẹ đang ở xa beacon',
              style: textTheme.bodyMedium
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Map card
            const AlertMapCard(),
            const SizedBox(height: AppSpacing.lg),

            // Device info card
            const BeaconInfoCard(),
            const SizedBox(height: AppSpacing.lg),

            // Primary actions
            const AlertActionButtons(),
          ],
        ),
      ),
      bottomNavigationBar: const BottomNavBar(),
    );
  }
}
