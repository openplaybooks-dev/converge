import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';

class HealthLogTabBar extends StatelessWidget {
  const HealthLogTabBar({super.key, required this.controller});

  final TabController controller;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        boxShadow: AppTheme.shadowSubtle,
      ),
      child: TabBar(
        controller: controller,
        indicatorSize: TabBarIndicatorSize.tab,
        indicator: BoxDecoration(
          color: AppTheme.coralTintColor,
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        ),
        dividerHeight: 0,
        labelColor: AppTheme.lilacColor,
        unselectedLabelColor: AppTheme.textSecondaryColor,
        labelStyle: textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w500,
        ),
        unselectedLabelStyle: textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w500,
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spaceSm + 4,
          vertical: 6,
        ),
        tabs: [
          Tab(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.medical_services_outlined, size: 18),
                const SizedBox(width: 6),
                const Text('Visits'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.thermostat_outlined, size: 18),
                const SizedBox(width: 6),
                const Text('Symptoms'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.notifications_outlined, size: 18),
                const SizedBox(width: 6),
                const Text('Reminders'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
