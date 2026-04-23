import 'package:flutter/material.dart';

class SignalBars extends StatelessWidget {
  final int strength;
  final ColorScheme colorScheme;

  const SignalBars({
    super.key,
    required this.strength,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(4, (index) {
        final heights = [0.25, 0.5, 0.75, 1.0];
        final isActive = index < strength;
        return Container(
          width: 4,
          height: 16,
          margin: const EdgeInsets.only(right: 2),
          decoration: BoxDecoration(
            color: isActive
                ? colorScheme.onSurface
                : colorScheme.outlineVariant,
            borderRadius: BorderRadius.circular(2),
          ),
          child: Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              height: 16 * heights[index],
            ),
          ),
        );
      }),
    );
  }
}
