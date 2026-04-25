import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_spacing.dart';
import 'package:baby_watch/widgets/home_bottom_nav_bar.dart';

import 'widgets/beacon_info_card.dart';
import 'widgets/last_location_map_card.dart';
import 'widgets/push_mute_card.dart';
import 'widgets/weak_signal_status_pill.dart';

// TODO(phase-05): wrap body in ref.watch(<provider>).when(...) once provider exists.
// Uses HomeWeakEmptyState / HomeWeakLoadingState / HomeWeakErrorState from home_weak_states.dart.

class HomeWeakScreen extends ConsumerWidget {
  const HomeWeakScreen({super.key});

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
                'https://lh3.googleusercontent.com/aida-public/AB6AXuBYqHZ3fB8FT-fm-b-gVPiHvGTeypRVCCn6qxyh1dLEMS3gEs5ZZ-Qkzt4EjbTcNFw2rfZcshGEUY43fbdKvm9kLmyuHFk2Lujy0XlI4DT4k_Y4h6QyRwKNHpyBkqzlzqSYbGooHFMLYzVzGDgEXcdb_HUWdSQXyxtewUk7LxsTv1q5eGI766zG0forUajcEqJMFcLXKcNpgfzQ1EManwwe-iFxQdxbgZjKwE2B8Obxp5IPO9KuuIlhkNdH8lO1hRsuRIwNH7NmguU6',
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Text(
              'Serenity',
              style:
                  textTheme.titleLarge?.copyWith(color: colorScheme.onSurface),
            ),
          ],
        ),
        actions: [
          // @converge:element navigate:notifications
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            color: colorScheme.onSurfaceVariant,
            tooltip: 'Thông báo',
            onPressed: () => context.push('/settings'),
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
            const WeakSignalStatusPill(),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Giám sát đang gián đoạn',
              style: textTheme.headlineLarge
                  ?.copyWith(color: colorScheme.onSurface),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Còn Bố đang gần beacon',
              style: textTheme.bodyMedium
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Map card
            const LastLocationMapCard(),
            const SizedBox(height: AppSpacing.lg),

            // Beacon info card
            const BeaconInfoCard(),
            const SizedBox(height: AppSpacing.lg),

            // Push-mute section
            const PushMuteCard(),
            const SizedBox(height: AppSpacing.lg),

            // Primary action
            // @converge:element action:tracking-status
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: colorScheme.onSurface,
                foregroundColor: colorScheme.surface,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.md,
                ),
              ),
              onPressed: () {
                showModalBottomSheet<void>(
                  context: context,
                  builder: (_) => const Placeholder(),
                );
              },
              icon: Icon(Icons.radar, size: 24, color: colorScheme.surface),
              label: Text(
                'Đang theo dõi',
                style: textTheme.labelLarge
                    ?.copyWith(color: colorScheme.surface),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Chúng tôi sẽ tự động thông báo khi kết nối ổn định trở lại.',
              style: textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const HomeBottomNavBar(),
    );
  }
}
