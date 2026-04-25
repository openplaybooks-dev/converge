import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/beacon_provider.dart';
import '../../providers/home_alert_phase_provider.dart';
import '../../state/home_alert_phase.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_bottom_nav_bar.dart';
import '../home_alert/widgets/alert_action_buttons.dart';
import '../home_safe/widgets/baby_location_map_card.dart';
import '../home_safe/widgets/beacon_strip.dart';
import '../home_safe/widgets/push_mute_section.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key, this.initialPhase});

  final HomeAlertPhase? initialPhase;

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    final forced = widget.initialPhase;
    if (forced != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(homeAlertPhaseControllerProvider.notifier).forcePhase(forced);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    final phase = ref.watch(homeAlertPhaseControllerProvider);
    final beacons = ref.watch(beaconsProvider);
    final beacon = beacons.where((b) => b.isPaired).isNotEmpty
        ? beacons.firstWhere((b) => b.isPaired)
        : (beacons.isNotEmpty ? beacons.first : null);

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        titleSpacing: AppSpacing.md,
        title: Text(
          'BabyGuard',
          style: textTheme.titleLarge?.copyWith(color: colorScheme.onSurface),
        ),
        actions: [
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
            _PhaseStatusPill(phase: phase),
            const SizedBox(height: AppSpacing.sm),
            Text(
              beacon?.name ?? 'BabyGuard',
              style: textTheme.headlineLarge
                  ?.copyWith(color: colorScheme.onSurface),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              _phaseSubtitle(phase),
              style: textTheme.bodyMedium
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: AppSpacing.lg),
            const BabyLocationMapCard(),
            const SizedBox(height: AppSpacing.lg),
            const BeaconStrip(),
            const SizedBox(height: AppSpacing.lg),
            const PushMuteSection(),
            if (phase == HomeAlertPhase.alertActive) ...[
              const SizedBox(height: AppSpacing.lg),
              const AlertActionButtons(),
            ],
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNavBar(),
    );
  }

  String _phaseSubtitle(HomeAlertPhase phase) {
    switch (phase) {
      case HomeAlertPhase.idle:
        return 'Còn Mẹ đang gần beacon';
      case HomeAlertPhase.weak:
        return 'Tín hiệu yếu — kiểm tra khoảng cách tới beacon';
      case HomeAlertPhase.lostCountdown:
        return 'Sắp mất tín hiệu — đang đếm ngược cảnh báo';
      case HomeAlertPhase.alertActive:
        return 'Mẹ đang ở xa beacon';
    }
  }
}

class _PhaseStatusPill extends StatelessWidget {
  const _PhaseStatusPill({required this.phase});

  final HomeAlertPhase phase;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    final appSemantic = theme.extension<AppSemanticColors>()!;

    final spec = switch (phase) {
      HomeAlertPhase.idle => (
          color: appSemantic.mint,
          icon: Icons.verified_user,
          fg: colorScheme.onSurface,
          label: 'Đang an toàn',
        ),
      HomeAlertPhase.weak => (
          color: appSemantic.alertPeach,
          icon: Icons.signal_cellular_0_bar,
          fg: colorScheme.error,
          label: 'Tín hiệu yếu',
        ),
      HomeAlertPhase.lostCountdown => (
          color: appSemantic.alertPeach,
          icon: Icons.timer_outlined,
          fg: colorScheme.error,
          label: 'Đang đếm ngược',
        ),
      HomeAlertPhase.alertActive => (
          color: appSemantic.alertPeach,
          icon: Icons.error,
          fg: colorScheme.error,
          label: 'Cảnh báo',
        ),
    };

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: spec.color,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(spec.icon, size: 20, color: spec.fg),
            const SizedBox(width: AppSpacing.xs),
            Text(
              spec.label,
              style: textTheme.labelLarge?.copyWith(color: spec.fg),
            ),
          ],
        ),
      ),
    );
  }
}
