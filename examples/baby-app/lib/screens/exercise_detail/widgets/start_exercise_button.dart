import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';

class StartExerciseButton extends StatelessWidget {
  const StartExerciseButton({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppTheme.screenHPadding,
          12,
          AppTheme.screenHPadding,
          12,
        ),
        child: SizedBox(
          height: 52,
          child: ElevatedButton(
// @converge:element StartExerciseButton-onPressed-1
            onPressed: () {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                builder: (_) => const SizedBox(
                  height: 300,
                  child: Center(child: Text('Exercise session starting...')),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.coralColor,
              foregroundColor: AppTheme.surfaceColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              ),
              textStyle: textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            child: const Text('Start Exercise'),
          ),
        )
            .animate()
            .fadeIn(
              delay: const Duration(milliseconds: 400),
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOut,
            ),
      ),
    );
  }
}
