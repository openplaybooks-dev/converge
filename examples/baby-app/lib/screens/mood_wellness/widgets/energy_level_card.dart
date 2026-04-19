import 'package:flutter/material.dart';

import '../../../theme/app_theme.dart';

class EnergyLevelCard extends StatefulWidget {
  const EnergyLevelCard({super.key});

  @override
  State<EnergyLevelCard> createState() => _EnergyLevelCardState();
}

class _EnergyLevelCardState extends State<EnergyLevelCard> {
  int _energyLevel = 4;

  static const _energyLabels = [
    'Very Low',
    'Low',
    'Moderate',
    'High',
    'Very High',
  ];

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Semantics(
      label: 'Energy level: ${_energyLabels[_energyLevel - 1]}',
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
              Text(
                'Energy Level',
                style: textTheme.headlineSmall?.copyWith(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppTheme.screenHPadding),

              // Energy bar segments
              Semantics(
                label: 'Energy level segments',
                child: Row(
                  children: List.generate(5, (index) {
                    final level = index + 1;
                    final isFilled = level <= _energyLevel;
                    return Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(
                          right: index < 4 ? 4 : 0,
                        ),
                        child: Semantics(
                          label: 'Set energy level to $level',
                          button: true,
                          child: GestureDetector(
                            onTap: () =>
                                setState(() => _energyLevel = level),
                            child: SizedBox(
                              height: 44,
                              child: Center(
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    color: isFilled
                                        ? AppTheme.lilacColor
                                        : AppTheme.chipBgColor,
                                    borderRadius: BorderRadius.circular(
                                      AppTheme.radiusFull,
                                    ),
                                  ),
                                  child: const SizedBox(
                                    height: 18,
                                    width: double.infinity,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 12),

              // Energy label
              Center(
                child: Text(
                  _energyLabels[_energyLevel - 1],
                  style: textTheme.labelLarge?.copyWith(
                    color: AppTheme.lilacColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
