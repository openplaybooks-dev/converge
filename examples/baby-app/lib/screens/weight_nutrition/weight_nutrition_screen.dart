import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import 'widgets/bmi_gauge_card.dart';
import 'widgets/quick_stats_row.dart';
import 'widgets/nutrition_tips_card.dart';
import 'widgets/weight_chart_card.dart';
import 'widgets/weight_history_section.dart';
import 'package:folio/widgets/overlays/weight_entry/weight_entry.dart';

class WeightNutritionScreen extends ConsumerWidget {
  const WeightNutritionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              backgroundColor: AppTheme.canvasColor,
              surfaceTintColor: AppTheme.canvasColor,
              leading: IconButton(
// @converge:element BackButton-onPressed-1
                onPressed: () => Navigator.maybePop(context),
                icon: const Icon(
                  Icons.chevron_left,
                  size: 22,
                  color: AppTheme.textPrimaryColor,
                ),
              ),
              title: Text(
                'Weight & Nutrition',
                style: textTheme.titleLarge?.copyWith(
                  color: AppTheme.textPrimaryColor,
                  fontWeight: FontWeight.w600,
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
                  const WeightChartCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                  const BmiGaugeCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                  const QuickStatsRow(),
                  const SizedBox(height: AppTheme.spaceLg),
                  const NutritionTipsCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                  const WeightHistorySection(),
                  const SizedBox(height: AppTheme.spaceLg),
                ]),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
// @converge:element FAB-onPressed-1
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            builder: (_) => const WeightEntry(),
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
            delay: AppTheme.staggerDelay * 5,
            duration: const Duration(milliseconds: 400),
            curve: AppTheme.springCurve,
          ),
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surfaceColor,
        boxShadow: AppTheme.shadowNav,
      ),
      child: NavigationBar(
        selectedIndex: 2,
// @converge:element BottomNav-onDestinationSelected-1
        onDestinationSelected: (index) => context.go(
          const ["/home", "/progress", "/health-log", "/mood", "/education"][index],
        ),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today),
            label: 'Progress',
          ),
          NavigationDestination(
            icon: Icon(Icons.favorite_outline),
            selectedIcon: Icon(Icons.favorite),
            label: 'Health',
          ),
          NavigationDestination(
            icon: Icon(Icons.self_improvement_outlined),
            selectedIcon: Icon(Icons.self_improvement),
            label: 'Wellness',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'Learn',
          ),
        ],
      ),
    );
  }
}
