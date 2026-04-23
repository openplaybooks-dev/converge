import 'package:flutter/material.dart';

class HeroIllustration extends StatelessWidget {
  const HeroIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: 176,
      height: 176,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        shape: BoxShape.circle,
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Image.network(
            'https://picsum.photos/seed/superkid/200/200',
            width: 128,
            height: 128,
            fit: BoxFit.contain,
          ),
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                color: colorScheme.surface,
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      ),
    );
  }
}