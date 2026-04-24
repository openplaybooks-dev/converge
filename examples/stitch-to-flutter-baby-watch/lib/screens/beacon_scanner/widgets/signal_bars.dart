import 'package:flutter/material.dart';

class SignalBars extends StatelessWidget {
  final int strength;

  const SignalBars({super.key, required this.strength});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SizedBox(
      width: 24,
      height: 16,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(4, (index) {
          final height = (index + 1) * 4;
          final isActive = index < strength;
          return Expanded(
            child: Container(
              margin: const EdgeInsets.only(right: 2),
              height: height.toDouble(),
              decoration: BoxDecoration(
                color: isActive
                    ? colorScheme.onSurface
                    : colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          );
        }),
      ),
    );
  }
}
