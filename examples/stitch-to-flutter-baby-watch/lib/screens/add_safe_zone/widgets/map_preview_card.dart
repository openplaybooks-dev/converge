import 'package:flutter/material.dart';

class MapPreviewCard extends StatelessWidget {
  const MapPreviewCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A000000),
            blurRadius: 24,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 192,
          color: const Color(0xFFF5F5F5),
          child: Stack(
            children: [
              Positioned.fill(
                child: Image.network(
                  'https://picsum.photos/seed/map3/400/200',
                  fit: BoxFit.cover,
                  color: const Color(0x4D000000),
                  colorBlendMode: BlendMode.darken,
                ),
              ),
              Center(
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0x3300C853),
                    border: Border.all(
                      color: const Color(0xFF00C853),
                      width: 2,
                    ),
                  ),
                ),
              ),
              Positioned(
                right: 16,
                bottom: 16,
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Theme.of(context).colorScheme.surface,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0x40000000),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.my_location,
                    color: Color(0xFF00C853),
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
