import 'package:flutter/material.dart';

class PageIndicator extends StatelessWidget {
  final bool isActive;
  final ColorScheme colorScheme;

  const PageIndicator({
    super.key,
    required this.isActive,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isActive
            ? colorScheme.onSurface
            : colorScheme.surfaceContainerHighest,
      ),
    );
  }
}
