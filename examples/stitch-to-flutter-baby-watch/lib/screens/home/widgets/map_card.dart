import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class MapCard extends StatefulWidget {
  const MapCard({super.key});

  @override
  State<MapCard> createState() => _MapCardState();
}

class _MapCardState extends State<MapCard> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  late AnimationController _floatController;
  late Animation<double> _floatAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat();
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.8).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeOut),
    );

    _floatController = AnimationController(
      duration: const Duration(milliseconds: 3000),
      vsync: this,
    )..repeat(reverse: true);
    _floatAnimation = Tween<double>(begin: 0, end: -4).animate(
      CurvedAnimation(parent: _floatController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _floatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 288,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0x0D000000),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            // Map with grayscale and brightness filter
            ColorFiltered(
              colorFilter: const ColorFilter.matrix([
                0.9,
                0,
                0,
                0,
                0,
                0,
                0.9,
                0,
                0,
                0,
                0,
                0,
                0.9,
                0,
                0,
                0,
                0,
                0,
                1,
                0,
              ]),
              child: CachedNetworkImage(
                imageUrl: 'https://picsum.photos/seed/map1/400/300',
                width: double.infinity,
                height: 288,
                fit: BoxFit.cover,
                color: const Color(0x0D000000),
                colorBlendMode: BlendMode.darken,
              ),
            ),
            // Beacon Point with pulse and float
            Center(
              child: AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Stack(
                    alignment: Alignment.center,
                    children: [
                      // Pulse ring
                      Transform.scale(
                        scale: _pulseAnimation.value,
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color:
                                const Color(0xFF4f635e).withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                      // Floating beacon
                      Transform.translate(
                        offset: Offset(0, _floatAnimation.value),
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFF4f635e),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Colors.white,
                              width: 4,
                            ),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x33000000),
                                blurRadius: 12,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.child_care,
                            color: Colors.white,
                            size: 18,
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
            // Last Seen Label
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x1A000000),
                      blurRadius: 8,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'VỊ TRÍ GẦN NHẤT',
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.05,
                                  color: const Color(0xFF5e6059),
                                ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Phòng khách • 2 phút trước',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF1E1E1E),
                                ),
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTapDown: (_) {},
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFF4f635e),
                          shape: BoxShape.circle,
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x1A000000),
                              blurRadius: 4,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.near_me,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
