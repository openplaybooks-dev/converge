import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../theme/app_theme.dart';
import 'package:folio/widgets/overlays/health_log_entry/health_log_entry.dart';
import 'widgets/doctor_visit_card.dart';
import 'widgets/bottom_nav_bar.dart';
import 'widgets/health_log_tab_bar.dart';

class HealthLogScreen extends StatefulWidget {
  const HealthLogScreen({super.key});

  @override
  State<HealthLogScreen> createState() => _HealthLogScreenState();
}

class _HealthLogScreenState extends State<HealthLogScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  static const _visitEntries = [
    DoctorVisit(
      date: '15 Apr 2026',
      doctorName: 'Dr. Amara',
      summary: 'Regular checkup — all vitals normal',
      notes:
          'Blood pressure 118/76, weight on track. Next appointment in 4 weeks for glucose screening.',
    ),
    DoctorVisit(
      date: '2 Apr 2026',
      doctorName: 'Dr. Amara',
      summary: 'Ultrasound scan — baby measuring on schedule',
      notes:
          'Growth percentile within normal range. Placenta anterior, no concerns flagged.',
    ),
    DoctorVisit(
      date: '18 Mar 2026',
      doctorName: null,
      summary: 'Blood work follow-up',
      notes:
          'Iron levels slightly low — started supplements. Recheck in two weeks.',
    ),
    DoctorVisit(
      date: '4 Mar 2026',
      doctorName: 'Dr. Lena',
      summary: 'First trimester screening',
      notes: null,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Scaffold(
      body: Column(
        children: [
          // App Bar
          Container(
            color: colorScheme.surface,
            padding: EdgeInsets.fromLTRB(
              AppTheme.screenHPadding,
              MediaQuery.of(context).padding.top + AppTheme.spaceMd,
              AppTheme.screenHPadding,
              AppTheme.spaceSm,
            ),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Health Log',
                style: textTheme.displaySmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),

          // Tab Bar
          HealthLogTabBar(controller: _tabController),

          // Tab View
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildVisitsList(textTheme, colorScheme),
                _buildEmptyTab(
                  textTheme,
                  colorScheme,
                  'No symptoms logged',
                ),
                _buildEmptyTab(
                  textTheme,
                  colorScheme,
                  'No reminders set',
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await showModalBottomSheet<Map<String, dynamic>>(
            context: context,
            isScrollControlled: true,
            builder: (_) => const HealthLogEntry(),
          );
          if (result != null && context.mounted) {
            // Handle result per spec
          }
        },
        backgroundColor: AppTheme.coralColor,
        elevation: 0,
        shape: const CircleBorder(),
        child: Icon(
          Icons.add,
          color: colorScheme.surface,
          size: 22,
        ),
      )
          .animate()
          .scale(
            begin: const Offset(0, 0),
            end: const Offset(1, 1),
            duration: const Duration(milliseconds: 400),
            curve: AppTheme.springCurve,
            delay: const Duration(milliseconds: 320),
          )
          .fadeIn(
            duration: const Duration(milliseconds: 400),
            delay: const Duration(milliseconds: 320),
          ),
      bottomNavigationBar: const BottomNavBar(),
    );
  }

  Widget _buildVisitsList(TextTheme textTheme, ColorScheme colorScheme) {
    return ListView.separated(
      padding: EdgeInsets.fromLTRB(
        AppTheme.screenHPadding,
        AppTheme.spaceLg,
        AppTheme.screenHPadding,
        96,
      ),
      itemCount: _visitEntries.length,
      separatorBuilder: (_, __) =>
          const SizedBox(height: AppTheme.cardSpacing),
      itemBuilder: (context, index) {
        return DoctorVisitCard(
          visit: _visitEntries[index],
          animationIndex: index,
        );
      },
    );
  }

  Widget _buildEmptyTab(
    TextTheme textTheme,
    ColorScheme colorScheme,
    String message,
  ) {
    return Center(
      child: Text(
        message,
        style: textTheme.bodyLarge?.copyWith(
          color: AppTheme.textSecondaryColor,
        ),
      ),
    );
  }

}

