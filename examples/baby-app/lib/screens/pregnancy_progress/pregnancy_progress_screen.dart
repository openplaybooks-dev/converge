import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import 'widgets/body_changes_card.dart';
import 'widgets/baby_development_card.dart';
import 'widgets/hero_header.dart';
import 'widgets/exercise_guide_card.dart';
import 'widgets/due_date_card.dart';
import 'widgets/self_care_card.dart';

class PregnancyProgressScreen extends ConsumerWidget {
  const PregnancyProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(pregnancyProfileProvider);
    final weekContents = ref.watch(weekContentProvider);
    final currentWeek = weekContents.where(
      (w) => w.weekNumber == profile.currentWeek,
    );
    final trimesterLabel = currentWeek.isNotEmpty
        ? currentWeek.first.trimesterLabel
        : 'Trimester ${profile.currentTrimester}';

    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 280,
              backgroundColor: AppTheme.canvasAltColor,
              surfaceTintColor: AppTheme.canvasAltColor,
              leading: IconButton(
                onPressed: () => Navigator.maybePop(context),
                icon: const Icon(
                  Icons.chevron_left,
                  size: 22,
                  color: AppTheme.textPrimaryColor,
                ),
              ),
              title: Text(
                'Week ${profile.currentWeek} — $trimesterLabel',
                style: textTheme.titleLarge?.copyWith(
                  color: AppTheme.textPrimaryColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
              flexibleSpace: const FlexibleSpaceBar(
                background: HeroHeader(),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.screenHPadding,
              ),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: AppTheme.spaceMd),
                  const BodyChangesCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                  const BabyDevelopmentCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                  const SelfCareCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                  const ExerciseGuideCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                  const DueDateCard(),
                  const SizedBox(height: AppTheme.spaceLg),
                ]),
              ),
            ),
          ],
        ),
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
        selectedIndex: 1,
        onDestinationSelected: (index) => context.go(const ['/home', '/progress', '/health-log', '/mood', '/education'][index]),
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
