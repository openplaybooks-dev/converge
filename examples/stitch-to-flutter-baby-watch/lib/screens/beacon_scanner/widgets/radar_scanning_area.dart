import 'package:flutter/material.dart';

class RadarScanningArea extends StatefulWidget {
  const RadarScanningArea({super.key});

  @override
  State<RadarScanningArea> createState() => _RadarScanningAreaState();
}

class _RadarScanningAreaState extends State<RadarScanningArea>
    with SingleTickerProviderStateMixin {
  late AnimationController _radarController;
  late Animation<double> _radarAnimation;

  @override
  void initState() {
    super.initState();
    _radarController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat();
    _radarAnimation = Tween<double>(begin: 1.0, end: 2.5).animate(
      CurvedAnimation(parent: _radarController, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _radarController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Center(
      child: SizedBox(
        width: 256,
        height: 256,
        child: Stack(
          alignment: Alignment.center,
          children: [
            AnimatedBuilder(
              animation: _radarAnimation,
              builder: (context, child) {
                return Transform.scale(
                  scale: _radarAnimation.value,
                  child: Container(
                    width: 256,
                    height: 256,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color:
                            colorScheme.outlineVariant.withValues(alpha: 0.2),
                        width: 2,
                      ),
                    ),
                  ),
                );
              },
            ),
            Container(
              width: 192,
              height: 192,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: colorScheme.outlineVariant.withValues(alpha: 0.4),
                  width: 2,
                ),
              ),
            ),
            Container(
              width: 128,
              height: 128,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: colorScheme.outlineVariant.withValues(alpha: 0.3),
              ),
            ),
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: colorScheme.onSurface,
                boxShadow: [
                  BoxShadow(
                    color: colorScheme.onSurface.withValues(alpha: 0.25),
                    blurRadius: 32,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Icon(
                Icons.bluetooth_searching,
                color: colorScheme.surface,
                size: 40,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
