import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_spacing.dart';
import '../../widgets/app_bottom_nav_bar.dart';
// ignore: unused_import
import 'safe_zones_states.dart';
import 'widgets/insight_tile.dart';
import 'widgets/safe_zone_card.dart';
import 'widgets/safe_zones_map_card.dart';

// TODO(phase-05): wrap body in ref.watch(<provider>).when(...) once provider exists,
// using SafeZonesEmptyState / SafeZonesLoadingState / SafeZonesErrorState.

class SafeZonesScreen extends ConsumerWidget {
  const SafeZonesScreen({super.key});

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
          icon: const Icon(Icons.menu),
          color: colorScheme.onSurface,
          tooltip: 'Menu',
          onPressed: () {
            showModalBottomSheet<void>(
              context: context,
              builder: (_) => const Placeholder(),
            );
          },
        ),
        centerTitle: true,
        title: Text(
          'Safe Zones',
          style: textTheme.titleLarge?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.md),
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
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuBFY4MgXwlozxAoqZPzg8_5mhpch_h7zaZMK7p1sradwAn73iTsdyqsbgJpr2m2O7ZkPiv12aW3DOQSqjn0kaCcMBWpFTqu-AcHNvBn0s6ZlrgkGaHYi5iFJRkjeeGxO7lDn-Uy_rO5xinsVhzum07gsgEQh-KEDXmw_upl9pB7XyPv7h4yFEEWZxiwth40CG0SwS-qseysiHrsGgFjUWlBM7L4UYPqIND_pYjk1HJ-vc9RAg0cFO5lykl-Cb3c5KFROOn5z1436wT0',
                ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          // Leave space for the FAB and bottom nav.
          120,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero editorial section
            Text(
              'GUARDIAN OVERLOOK',
              style: textTheme.labelSmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.6,
                fontSize: 10,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Peace of mind,\ndefined by boundaries.',
              style: textTheme.headlineLarge?.copyWith(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w800,
                height: 1.1,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Mini Map Card
            const SafeZonesMapCard(),
            const SizedBox(height: AppSpacing.lg),

            // Active Zones header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Active Zones',
                    style: textTheme.titleLarge?.copyWith(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    'Scroll to explore',
                    style: textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Zone cards
            // @converge:element navigate:zone-detail
            // @converge:element action:toggle-zone-home
            // @converge:element action:edit-zone-home
            const SafeZoneCard(
              icon: Icons.home,
              title: 'Home',
              radiusLabel: '200m',
              address: '123 Calm Valley Street, Serenity District',
              isActive: true,
            ),
            const SizedBox(height: AppSpacing.sm),
            // @converge:element navigate:zone-detail
            // @converge:element action:toggle-zone-school
            // @converge:element action:edit-zone-school
            const SafeZoneCard(
              icon: Icons.school,
              title: 'School',
              radiusLabel: '500m',
              address: '456 Bright Minds Academy, Knowledge Ave',
              isActive: true,
            ),
            const SizedBox(height: AppSpacing.sm),
            // @converge:element navigate:zone-detail
            // @converge:element action:toggle-zone-grandma
            // @converge:element action:edit-zone-grandma
            const SafeZoneCard(
              icon: Icons.favorite,
              title: "Grandma's House",
              radiusLabel: '150m',
              address: '789 Orchard Grove, Heritage Park',
              isActive: false,
            ),
            const SizedBox(height: AppSpacing.lg),

            // Insights bento preview
            Row(
              children: [
                Expanded(
                  child: InsightTile(
                    icon: Icons.notifications_active_outlined,
                    iconColor: colorScheme.onSurfaceVariant,
                    backgroundColor: colorScheme.surfaceContainerLow,
                    title: '24 Alerts',
                    subtitle: "This week's entry/exit events",
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: InsightTile(
                    icon: Icons.battery_full,
                    iconColor: colorScheme.tertiary,
                    backgroundColor: colorScheme.tertiaryContainer,
                    title: '98% Secure',
                    subtitle: 'Optimal zone coverage',
                    titleColor: colorScheme.onTertiaryContainer,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      // @converge:element action:add-safe-zone
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: colorScheme.onSurface,
        foregroundColor: colorScheme.surface,
        onPressed: () {
          showModalBottomSheet<void>(
            context: context,
            builder: (_) => const Placeholder(),
          );
        },
        icon: const Icon(Icons.add),
        label: Text(
          'Thêm vùng an toàn',
          style: textTheme.labelLarge?.copyWith(
            color: colorScheme.surface,
            fontWeight: FontWeight.w700,
          ),
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
