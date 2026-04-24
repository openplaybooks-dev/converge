import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../theme/app_theme.dart';
import 'widgets/category_chips.dart';
import 'widgets/exercise_card.dart';
import 'widgets/featured_exercise_card.dart';
import 'widgets/bottom_nav_bar.dart';
import 'widgets/mood_banner.dart';

class MindfulnessScreen extends StatefulWidget {
  const MindfulnessScreen({super.key});

  @override
  State<MindfulnessScreen> createState() => _MindfulnessScreenState();
}

class _MindfulnessScreenState extends State<MindfulnessScreen> {
  int _selectedCategoryIndex = 0;

  static const _categories = ['All', 'Breathing', 'Stretching', 'Meditation'];

  static const _exercises = [
    _Exercise(name: 'Prenatal Stretch', category: 'Stretching', duration: '10 min'),
    _Exercise(name: 'Body Scan', category: 'Meditation', duration: '8 min'),
    _Exercise(name: '4-7-8 Breathing', category: 'Breathing', duration: '5 min'),
    _Exercise(name: 'Gentle Yoga', category: 'Stretching', duration: '15 min'),
  ];

  List<_Exercise> get _filteredExercises {
    if (_selectedCategoryIndex == 0) return _exercises;
    final cat = _categories[_selectedCategoryIndex];
    return _exercises.where((e) => e.category == cat).toList();
  }

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
                  'Mindfulness',
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
                  const SizedBox(height: AppTheme.spaceMd),

                  // Category chips
                  CategoryChips(
                    categories: _categories,
                    selectedIndex: _selectedCategoryIndex,
// @converge:element CategoryChips-onSelected-1
                    onSelected: (index) =>
                        setState(() => _selectedCategoryIndex = index),
                  )
                      .animate()
                      .fadeIn(
                        duration: const Duration(milliseconds: 300),
                        curve: AppTheme.springCurve,
                      ),
                  const SizedBox(height: AppTheme.spaceLg),

                  // Featured card
                  const FeaturedExerciseCard()
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
                  const SizedBox(height: AppTheme.spaceLg),

                  // Section heading
                  Text(
                    'Exercises',
                    style: textTheme.headlineSmall?.copyWith(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppTheme.spaceMd),

                  // Exercise grid
                  _buildExerciseGrid(),
                  const SizedBox(height: AppTheme.spaceLg),

                  // Mood banner
                  const MoodBanner()
                      .animate()
                      .fadeIn(
                        delay: AppTheme.staggerDelay * 5,
                        duration: AppTheme.cardDuration,
                        curve: AppTheme.springCurve,
                      )
                      .slideY(
                        begin: 0.05,
                        end: 0,
                        delay: AppTheme.staggerDelay * 5,
                        duration: AppTheme.cardDuration,
                        curve: AppTheme.springCurve,
                      ),
                  const SizedBox(height: 88),
                ]),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const BottomNavBar(),
    );
  }

  Widget _buildExerciseGrid() {
    final exercises = _filteredExercises;
    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppTheme.cardSpacing,
        mainAxisSpacing: AppTheme.cardSpacing,
        childAspectRatio: 0.85,
      ),
      itemCount: exercises.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemBuilder: (context, index) {
        final exercise = exercises[index];
        return ExerciseCard(
          name: exercise.name,
          category: exercise.category,
          duration: exercise.duration,
          index: index,
        );
      },
    );
  }

}

class _Exercise {
  const _Exercise({
    required this.name,
    required this.category,
    required this.duration,
  });

  final String name;
  final String category;
  final String duration;
}
