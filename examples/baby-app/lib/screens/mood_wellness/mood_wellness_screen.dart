import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import 'widgets/mood_trends_card.dart';
import 'widgets/energy_level_card.dart';
import 'widgets/recommendations_card.dart';
import 'widgets/mood_history_entry.dart';
import 'widgets/todays_mood_card.dart';
import 'package:folio/widgets/overlays/mood_log/mood_log.dart';

class MoodWellnessScreen extends StatefulWidget {
  const MoodWellnessScreen({super.key});

  @override
  State<MoodWellnessScreen> createState() => _MoodWellnessScreenState();
}

class _MoodWellnessScreenState extends State<MoodWellnessScreen> {
  static const _historyEntries = [
    MoodHistoryEntryData(
      mood: 'Feeling Great',
      energy: 'Energy: High',
      date: 'April 18',
      notes:
          'Had a wonderful morning walk and feeling energized for the day ahead.',
      moodLevel: 5,
    ),
    MoodHistoryEntryData(
      mood: 'Feeling Good',
      energy: 'Energy: Moderate',
      date: 'April 17',
      notes: null,
      moodLevel: 4,
    ),
    MoodHistoryEntryData(
      mood: 'Neutral',
      energy: 'Energy: Low',
      date: 'April 16',
      notes: 'Feeling a bit tired today, but managing well overall.',
      moodLevel: 3,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // App bar
            SliverToBoxAdapter(
              child: Container(
                color: colorScheme.surface,
                padding: const EdgeInsets.fromLTRB(
                  AppTheme.screenHPadding,
                  AppTheme.spaceXl,
                  AppTheme.screenHPadding,
                  AppTheme.spaceMd,
                ),
                child: Text(
                  'Mood & Wellness',
                  style: textTheme.displaySmall?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),

            // Content
            SliverPadding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.screenHPadding,
              ),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: AppTheme.spaceLg),

                  // Today's Mood Card
                  const TodaysMoodCard()
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
                  const SizedBox(height: AppTheme.sectionSpacing),

                  // Mood Trends Chart Card
                  const MoodTrendsCard()
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
                  const SizedBox(height: AppTheme.sectionSpacing),

                  // Energy Level Card
                  const EnergyLevelCard()
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
                  const SizedBox(height: AppTheme.sectionSpacing),

                  // Recommendations Card
                  const RecommendationsCard()
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
                  const SizedBox(height: AppTheme.sectionSpacing),

                  // Recent Entries heading
                  Text(
                    'Recent Entries',
                    style: textTheme.headlineSmall?.copyWith(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppTheme.cardSpacing),

                  // History entries
                  ..._historyEntries.asMap().entries.map(
                        (entry) => Padding(
                          padding: EdgeInsets.only(
                            bottom: entry.key < _historyEntries.length - 1
                                ? AppTheme.cardSpacing
                                : 0,
                          ),
                          child: MoodHistoryEntry(
                            entry: entry.value,
                          )
                              .animate()
                              .fadeIn(
                                delay: AppTheme.staggerDelay * (entry.key + 4),
                                duration: AppTheme.cardDuration,
                                curve: AppTheme.springCurve,
                              )
                              .slideY(
                                begin: 0.05,
                                end: 0,
                                delay: AppTheme.staggerDelay * (entry.key + 4),
                                duration: AppTheme.cardDuration,
                                curve: AppTheme.springCurve,
                              ),
                        ),
                      ),
                  const SizedBox(height: 88),
                ]),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: Semantics(
        label: 'Log mood',
        button: true,
        child: FloatingActionButton(
// @converge:element FAB-onPressed-1
          onPressed: () async {
            final result = await showModalBottomSheet<Map<String, dynamic>>(
              context: context,
              isScrollControlled: true,
              builder: (_) => const MoodLog(),
            );
            if (result != null && context.mounted) {
              // Handle result
            }
          },
          backgroundColor: AppTheme.coralColor,
          shape: const CircleBorder(),
          child: const Icon(
            Icons.add,
            color: AppTheme.surfaceColor,
            size: 22,
          ),
        ),
      )
          .animate()
          .scale(
            begin: const Offset(0, 0),
            end: const Offset(1, 1),
            delay: const Duration(milliseconds: 200),
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
        selectedIndex: 3,
// @converge:element BottomNav-onDestinationSelected-1
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
