import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import 'widgets/exercise_hero_card.dart';
import 'widgets/exercise_chips_row.dart';
import 'widgets/benefits_card.dart';
import 'widgets/instructions_card.dart';
import 'widgets/start_exercise_button.dart';

class ExerciseDetailScreen extends ConsumerWidget {
  const ExerciseDetailScreen({super.key});

  // Placeholder data — will be replaced by provider data via route param.
  static const _exerciseName = 'Deep Breathing';
  static const _category = 'Breathing';
  static const _duration = '5 min';
  static const _difficulty = 'Beginner';
  static const _steps = [
    'Find a comfortable seated position with your back straight and shoulders relaxed',
    'Close your eyes gently and bring attention to your natural breath',
    'Inhale slowly through your nose for 4 counts, feeling your belly expand',
    'Hold your breath gently for 4 counts',
    'Exhale slowly through your mouth for 6 counts, releasing tension',
  ];
  static const _benefits = [
    'Reduces stress and anxiety levels',
    'Improves oxygen flow to you and baby',
    'Promotes better sleep quality',
    'Helps prepare for labor breathing techniques',
  ];

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
          tooltip: 'Go back to mindfulness',
// @converge:element BackButton-onPressed-1
          onPressed: () => context.pop(),
        ),
        title: Text(
          _exerciseName,
          style: textTheme.titleLarge?.copyWith(
            color: colorScheme.onSurface,
            fontWeight: FontWeight.w600,
          ),
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.screenHPadding,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppTheme.spaceMd),

            // 7.1 Illustration Card
            const ExerciseHeroCard(
              exerciseName: _exerciseName,
              category: _category,
            ),
            const SizedBox(height: AppTheme.spaceLg),

            // 7.2 Instructions
            const InstructionsCard(steps: _steps),
            const SizedBox(height: AppTheme.spaceLg),

            // 7.3 Duration & Difficulty chips
            const ExerciseChipsRow(
              duration: _duration,
              difficulty: _difficulty,
            ),
            const SizedBox(height: AppTheme.spaceLg),

            // 7.4 Benefits
            const BenefitsCard(benefits: _benefits),
            const SizedBox(height: 96), // clearance for footer
          ],
        ),
      ),
      bottomNavigationBar: const StartExerciseButton(),
    );
  }

}
