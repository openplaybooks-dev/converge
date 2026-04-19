import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import '../../widgets/overlays/due_date_picker/due_date_picker.dart';
import 'widgets/display_section.dart';
import 'widgets/notifications_section.dart';
import 'widgets/pregnancy_section.dart';
import 'widgets/data_section.dart';
import 'widgets/about_section.dart';
import 'widgets/profile_section.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          color: colorScheme.onSurface,
          tooltip: 'Go back',
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Settings',
          style: textTheme.displaySmall?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.screenHPadding,
          vertical: AppTheme.screenHPadding,
        ),
        children: [
          // 7.1 Profile Section
          const ProfileSection(animationIndex: 0),
          const SizedBox(height: AppTheme.spaceLg),

          // 7.2 Pregnancy Settings
          PregnancySection(
            animationIndex: 1,
            onEditDueDate: () async {
              final result = await showDialog<DateTime>(
                context: context,
                builder: (_) => const Dialog(
                  backgroundColor: Colors.transparent,
                  child: DueDatePicker(),
                ),
              );
              if (result != null && context.mounted) {
                debugPrint('Due date selected: $result');
              }
            },
          ),
          const SizedBox(height: AppTheme.spaceLg),

          // 7.3 Notifications
          const NotificationsSection(animationIndex: 2),
          const SizedBox(height: AppTheme.spaceLg),

          // 7.4 Display
          const DisplaySection(animationIndex: 3),
          const SizedBox(height: AppTheme.spaceLg),

          // 7.5 Data
          const DataSection(animationIndex: 4),
          const SizedBox(height: AppTheme.spaceLg),

          // 7.6 About
          const AboutSection(animationIndex: 5),
          const SizedBox(height: AppTheme.spaceLg),
        ],
      ),
    );
  }

}
