import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import 'widgets/calendar_card.dart';
import 'widgets/current_cycle_card.dart';
import 'widgets/cycle_history_card.dart';
import 'widgets/bottom_nav_bar.dart';
import 'widgets/irregular_notes_card.dart';
import 'package:folio/widgets/overlays/cycle_entry/cycle_entry.dart';

class CycleTrackingScreen extends ConsumerWidget {
  const CycleTrackingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cycleEntries = ref.watch(cycleEntriesProvider);

    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // App Bar
            SliverAppBar(
              pinned: true,
              backgroundColor: AppTheme.canvasColor,
              surfaceTintColor: AppTheme.canvasColor,
              title: Text(
                'Cycle Tracker (${cycleEntries.length})',
                style: textTheme.headlineMedium?.copyWith(
                  color: AppTheme.textPrimaryColor,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.screenHPadding,
              ),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: AppTheme.spaceMd),
                  // 7.1 Calendar View Card
                  const CalendarCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                  // 7.2 Current Cycle Summary Card
                  const CurrentCycleCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                  // 7.3 Cycle History List
                  const CycleHistoryCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                  // 7.4 Irregular Cycle Notes Card
                  const IrregularNotesCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                ]),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          showModalBottomSheet<Map<String, dynamic>>(
            context: context,
            isScrollControlled: true,
            builder: (_) => const CycleEntry(),
          );
        },
        backgroundColor: AppTheme.coralColor,
        shape: const CircleBorder(),
        child: const Icon(
          Icons.add,
          color: AppTheme.surfaceColor,
          size: 22,
        ),
      )
          .animate()
          .scale(
            begin: const Offset(0, 0),
            end: const Offset(1, 1),
            delay: AppTheme.staggerDelay * 4,
            duration: const Duration(milliseconds: 400),
            curve: AppTheme.springCurve,
          ),
      bottomNavigationBar: const BottomNavBar(),
    );
  }
}
