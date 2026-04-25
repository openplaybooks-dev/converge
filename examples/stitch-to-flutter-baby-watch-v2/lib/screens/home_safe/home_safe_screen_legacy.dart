import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:baby_watch/widgets/app_bottom_nav_bar.dart';

import '../../theme/app_spacing.dart';
import 'widgets/baby_location_map_card.dart';
import 'widgets/beacon_strip.dart';
import 'widgets/push_mute_section.dart';
import 'widgets/safe_status_pill.dart';

// TODO(phase-05): wrap body in ref.watch(<provider>).when(...) once provider exists,
// using HomeSafeEmptyState / HomeSafeLoadingState / HomeSafeErrorState.

class HomeSafeScreen extends ConsumerWidget {
  const HomeSafeScreen({super.key});

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
        title: Row(
          children: [
            const CircleAvatar(
              radius: 20,
              backgroundImage: CachedNetworkImageProvider(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuA3mhnbHiAGcoJSuOQu1TF3eSJnvWp_UNbftki7P9KaHmm2J8AFzTasOAxtQju2S6j-ZOg95vhG20BZSo4oJeSigh9aT4RlRI4CljK2-RGku93IXyIu6jQnN5OUVYF9T8U-N8S4cjbqRiN_WkZUD9nCaAJ_vhXQr34Qg7keTtQmQCffjXRKpB7yyvoqVxAfFPyihAjWEo6VZpUZ6xdnerLATOiw_GA9Ca7ygMgVnffbU6n5h1b8h35JKBxsgcFQO3hRW3-jqvrvtjrv',
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Text(
              'BabyGuard',
              style:
                  textTheme.titleLarge?.copyWith(color: colorScheme.onSurface),
            ),
          ],
        ),
        actions: [
          // @converge:element navigate:notifications
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            color: colorScheme.onSurface,
            tooltip: 'Thông báo',
            onPressed: () => context.push('/history'),
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
            // Status section
            const SafeStatusPill(),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Bé Na',
              style: textTheme.headlineLarge
                  ?.copyWith(color: colorScheme.onSurface),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Còn Mẹ đang gần beacon',
              style: textTheme.bodyMedium
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Map card
            const BabyLocationMapCard(),
            const SizedBox(height: AppSpacing.lg),

            // Beacon strip
            const BeaconStrip(),
            const SizedBox(height: AppSpacing.lg),

            // Push-mute section
            const PushMuteSection(),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNavBar(),
    );
  }
}
