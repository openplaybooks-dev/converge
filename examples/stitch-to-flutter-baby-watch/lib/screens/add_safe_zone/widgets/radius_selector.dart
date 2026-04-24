import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

class RadiusSelector extends StatefulWidget {
  const RadiusSelector({super.key});

  @override
  State<RadiusSelector> createState() => _RadiusSelectorState();
}

class _RadiusSelectorState extends State<RadiusSelector> {
  final List<String> _radii = ['25m', '50m', '100m', '200m'];
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Bán kính an toàn',
          style: textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.1,
            color: AppTheme.brandOnSurfaceVariant,
          ),
        ),
        const SizedBox(height: AppTheme.spaceSm),
        Row(
          children: List.generate(_radii.length, (index) {
            final isSelected = index == _selectedIndex;
            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(
                    right: index < _radii.length - 1 ? AppTheme.spaceSm : 0),
                child: GestureDetector(
                  onTap: () => setState(() => _selectedIndex = index),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme.brandGreen
                          : colorScheme.surface,
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                      border: Border.all(
                        color: isSelected
                            ? AppTheme.brandGreen
                            : AppTheme.brandBorder,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Text(
                      _radii[index],
                      textAlign: TextAlign.center,
                      style: textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: isSelected
                            ? colorScheme.surface
                            : AppTheme.brandOnSurface,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}
