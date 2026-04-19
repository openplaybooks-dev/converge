import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_theme.dart';
import 'tip_callout_block.dart';

class ArticleBodyCard extends StatelessWidget {
  const ArticleBodyCard({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Semantics(
      label: 'Article body',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          boxShadow: AppTheme.shadowStandard,
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.screenHPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Section 1
              Semantics(
                header: true,
                child: Text(
                  'Why Nutrition Matters Early',
                  style: textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                  ),
                ),
              ),
              const SizedBox(height: AppTheme.spaceSm + 4),
              Text(
                'The first trimester is a period of rapid development for your baby. During these early weeks, critical structures like the neural tube, heart, and major organs begin to form. The nutrients you consume play a direct role in supporting this growth.',
                style: textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: AppTheme.spaceSm + 4),
              Text(
                'Focusing on nutrient-dense whole foods can help your body adapt to the changes of early pregnancy while providing the building blocks your baby needs.',
                style: textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: AppTheme.spaceSm + 4),

              // Tip block
              const TipCalloutBlock(),
              const SizedBox(height: AppTheme.spaceLg),

              // Section 2
              Semantics(
                header: true,
                child: Text(
                  'Key Nutrients to Prioritize',
                  style: textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                  ),
                ),
              ),
              const SizedBox(height: AppTheme.spaceSm + 4),
              Text(
                'Folate is one of the most important nutrients during the first trimester. It supports neural tube development and can be found in leafy greens, citrus fruits, and fortified cereals. Your prenatal vitamin likely contains folic acid, the synthetic form.',
                style: textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: AppTheme.spaceSm + 4),
              Text(
                'Iron supports increased blood volume and oxygen delivery to your baby. Good sources include lean meats, spinach, lentils, and beans. Pairing iron-rich foods with vitamin C can help your body absorb it more effectively.',
                style: textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: AppTheme.spaceLg),

              // Section 3
              Semantics(
                header: true,
                child: Text(
                  'Simple Meal Ideas',
                  style: textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                  ),
                ),
              ),
              const SizedBox(height: AppTheme.spaceSm + 4),
              Text(
                'A balanced breakfast might include whole-grain toast with avocado and a side of berries. For lunch, consider a spinach salad with chickpeas, cherry tomatoes, and a citrus dressing.',
                style: textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: AppTheme.spaceSm + 4),
              Text(
                'Snacks like yogurt with granola, apple slices with almond butter, or a handful of trail mix can help maintain steady energy levels between meals.',
                style: textTheme.bodyLarge?.copyWith(
                  color: colorScheme.onSurface,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(
          delay: const Duration(milliseconds: 160),
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        )
        .slideY(
          begin: 0.05,
          end: 0,
          delay: const Duration(milliseconds: 160),
          duration: AppTheme.cardDuration,
          curve: AppTheme.springCurve,
        );
  }
}
