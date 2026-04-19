import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../theme/app_theme.dart';
import '_widgets/greeting_header.dart';
import '_widgets/hero_illustration_card.dart';
import '_widgets/mode_selector_pill.dart';
import '_widgets/pagination_dots.dart';
import '_widgets/stat_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(pregnancyProfileProvider);
    final weightEntries = ref.watch(weightEntriesProvider);
    final moodEntries = ref.watch(moodEntriesProvider);
    final doctorVisits = ref.watch(doctorVisitsProvider);

    final latestWeight = weightEntries.isNotEmpty
        ? weightEntries.last.value.toStringAsFixed(1)
        : '--';
    final latestMood = moodEntries.isNotEmpty
        ? moodEntries.last.moodLevel.toString()
        : '--';

    final now = DateTime.now();
    final nextVisit = doctorVisits
        .where((v) => v.date.isAfter(now))
        .toList()
      ..sort((a, b) => a.date.compareTo(b.date));
    final daysUntilCheckup = nextVisit.isNotEmpty
        ? nextVisit.first.date.difference(now).inDays.toString()
        : '--';

    final weekContents = ref.watch(weekContentProvider);
    final currentWeekContent = weekContents.where(
      (w) => w.weekNumber == profile.currentWeek,
    );
    final sizeComparison = currentWeekContent.isNotEmpty
        ? currentWeekContent.first.sizeComparison
        : 'baby';

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.coralColor,
          onRefresh: () async {},
          child: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTheme.screenHPadding,
                ),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    const SizedBox(height: AppTheme.spaceMd),
                    GreetingHeader(
                      userName: 'Good morning, ${profile.userName}',
                      dateText: 'Thursday, 17 April',
                    ),
                    const SizedBox(height: AppTheme.sectionSpacing),
                    ModeSelectorPill(
                      modeLabel: 'Pregnancy Mode',
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          builder: (_) => SafeArea(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const SizedBox(height: AppTheme.spaceMd),
                                Text(
                                  'Select Mode',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: AppTheme.spaceMd),
                                ListTile(
                                  leading: const Icon(Icons.pregnant_woman,
                                      color: AppTheme.coralColor),
                                  title: const Text('Pregnancy Mode'),
                                  onTap: () => Navigator.pop(context),
                                ),
                                ListTile(
                                  leading: const Icon(Icons.self_improvement,
                                      color: AppTheme.lilacColor),
                                  title: const Text('Wellness Mode'),
                                  onTap: () => Navigator.pop(context),
                                ),
                                const SizedBox(height: AppTheme.spaceMd),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: AppTheme.sectionSpacing),
                    HeroIllustrationCard(
                      weekNumber: profile.currentWeek,
                      sizeComparison: sizeComparison,
                    ),
                    const SizedBox(height: AppTheme.sectionSpacing),
                    _buildPrimaryCta(context),
                    const SizedBox(height: AppTheme.spaceMd),
                    const PaginationDots(count: 3, activeIndex: 0),
                    const SizedBox(height: AppTheme.sectionSpacing),
                    _buildStatCardsGrid(
                      context,
                      latestWeight: latestWeight,
                      currentWeek: profile.currentWeek.toString(),
                      latestMood: latestMood,
                      daysUntilCheckup: daysUntilCheckup,
                    ),
                    const SizedBox(height: AppTheme.spaceLg),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  Widget _buildPrimaryCta(BuildContext context) {
    return Center(
      child: ElevatedButton(
        onPressed: () => context.push('/cycle'),
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(0, 44),
          padding: const EdgeInsets.symmetric(
            horizontal: AppTheme.spaceXl,
            vertical: 14,
          ),
        ),
        child: Text(
          'Track Today',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: AppTheme.surfaceColor,
                fontWeight: FontWeight.w600,
              ),
        ),
      ),
    );
  }

  Widget _buildStatCardsGrid(
    BuildContext context, {
    required String latestWeight,
    required String currentWeek,
    required String latestMood,
    required String daysUntilCheckup,
  }) {
    return GridView.count(
      crossAxisCount: 2,
      mainAxisSpacing: AppTheme.screenHPadding,
      crossAxisSpacing: AppTheme.screenHPadding,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        StatCard(
          icon: Icons.monitor_weight_outlined,
          iconColor: AppTheme.coralColor,
          value: latestWeight,
          unit: 'Kg',
          label: 'Your weight',
          valueColor: AppTheme.coralColor,
          onTap: () => context.push('/weight'),
        )
            .animate()
            .fadeIn(
              duration: AppTheme.cardDuration,
              curve: AppTheme.springCurve,
            )
            .slideY(
              begin: 0.05,
              end: 0,
              duration: AppTheme.cardDuration,
              curve: AppTheme.springCurve,
            ),
        StatCard(
          icon: Icons.child_care,
          iconColor: AppTheme.lilacColor,
          value: currentWeek,
          unit: 'wk',
          label: 'Baby size',
          valueColor: AppTheme.lilacColor,
          onTap: () => context.push('/progress'),
        )
            .animate()
            .fadeIn(
              delay: AppTheme.staggerDelay,
              duration: AppTheme.cardDuration,
              curve: AppTheme.springCurve,
            )
            .slideY(
              begin: 0.05,
              end: 0,
              delay: AppTheme.staggerDelay,
              duration: AppTheme.cardDuration,
              curve: AppTheme.springCurve,
            ),
        StatCard(
          icon: Icons.mood,
          iconColor: AppTheme.coralColor,
          value: latestMood,
          unit: '/5',
          label: 'Mood today',
          valueColor: AppTheme.coralColor,
          onTap: () => context.push('/mood'),
        )
            .animate()
            .fadeIn(
              delay: AppTheme.staggerDelay * 2,
              duration: AppTheme.cardDuration,
              curve: AppTheme.springCurve,
            )
            .slideY(
              begin: 0.05,
              end: 0,
              delay: AppTheme.staggerDelay * 2,
              duration: AppTheme.cardDuration,
              curve: AppTheme.springCurve,
            ),
        StatCard(
          icon: Icons.calendar_today,
          iconColor: AppTheme.lilacColor,
          value: daysUntilCheckup,
          unit: 'days',
          label: 'Next checkup',
          valueColor: AppTheme.lilacColor,
          onTap: () => context.push('/health-log'),
        )
            .animate()
            .fadeIn(
              delay: AppTheme.staggerDelay * 3,
              duration: AppTheme.cardDuration,
              curve: AppTheme.springCurve,
            )
            .slideY(
              begin: 0.05,
              end: 0,
              delay: AppTheme.staggerDelay * 3,
              duration: AppTheme.cardDuration,
              curve: AppTheme.springCurve,
            ),
      ],
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surfaceColor,
        boxShadow: AppTheme.shadowNav,
      ),
      child: NavigationBar(
        selectedIndex: 0,
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
