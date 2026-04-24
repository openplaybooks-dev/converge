import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Alert screen - Emergency alert when beacon is not detected
class AlertScreen extends StatefulWidget {
  const AlertScreen({super.key});

  @override
  State<AlertScreen> createState() => _AlertScreenState();
}

class _AlertScreenState extends State<AlertScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _ringController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _ringAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _ringController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();
    _ringAnimation = Tween<double>(begin: 1.0, end: 1.5).animate(
      CurvedAnimation(parent: _ringController, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _ringController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F2EE),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Pulsing Alert Icon
              AnimatedBuilder(
                animation: Listenable.merge([_pulseAnimation, _ringAnimation]),
                builder: (context, child) {
                  return Stack(
                    alignment: Alignment.center,
                    children: [
                      Transform.scale(
                        scale: _ringAnimation.value,
                        child: Container(
                          width: 128,
                          height: 128,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF9f403d).withValues(
                                alpha: 0.6 * (1.5 - _ringAnimation.value)),
                          ),
                        ),
                      ),
                      Transform.scale(
                        scale: _pulseAnimation.value,
                        child: Container(
                          width: 128,
                          height: 128,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Color(0xFF9f403d),
                            boxShadow: [
                              BoxShadow(
                                color: Color(0x40000000),
                                blurRadius: 50,
                                offset: Offset(0, 25),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.warning_rounded,
                            size: 60,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 32),
              // Status Text
              Column(
                children: [
                  Text(
                    'KHẨN CẤP',
                    style: TextStyle(
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.02,
                      color: const Color(0xFF9f403d),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Không thấy beacon',
                    style: TextStyle(
                      fontFamily: 'Manrope',
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF31332e),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
              // Countdown Timer Card
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x1A000000),
                      blurRadius: 16,
                      offset: Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    const Text(
                      'Thời gian còn lại',
                      style: TextStyle(
                        fontFamily: 'Manrope',
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.1,
                        color: Color(0xFF9f403d),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      '32',
                      style: TextStyle(
                        fontFamily: 'Plus Jakarta Sans',
                        fontSize: 72,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF9f403d),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'giây trước khi báo động',
                      style: TextStyle(
                        fontFamily: 'Manrope',
                        fontSize: 14,
                        color: Color(0xFF5e6059),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),
              // Sound/Vibration Indicators
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _IndicatorChip(icon: Icons.volume_up, label: 'Âm thanh'),
                  const SizedBox(width: 24),
                  _IndicatorChip(icon: Icons.vibration, label: 'Rung'),
                ],
              ),
              const SizedBox(height: 40),
              // Acknowledge Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(

// @converge:element AlertScreen-ElevatedButton-onPressed-1
                  onPressed: () => context.pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF31332e),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(9999),
                    ),
                    elevation: 8,
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle, size: 28),
                      SizedBox(width: 12),
                      Text(
                        'Tôi đã kiểm tra',
                        style: TextStyle(
                          fontFamily: 'Manrope',
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

class _IndicatorChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _IndicatorChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Color(0xFF9f403d),
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Manrope',
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF31332e),
          ),
        ),
      ],
    );
  }
}
