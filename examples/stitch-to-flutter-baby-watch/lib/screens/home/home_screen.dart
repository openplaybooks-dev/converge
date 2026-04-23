import 'package:flutter/material.dart';
import 'package:folio/widgets/app_bottom_nav.dart';
import 'package:folio/widgets/app_nav_bar.dart';
import 'package:folio/widgets/overlays/test_alert/test_alert.dart';
import 'package:go_router/go_router.dart';

/// Home screen for BabyGuard - primary dashboard showing beacon monitoring status
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppNavBar(
        title: 'BabyGuard',
        leadingWidth: 56,
        leading: Padding(
          padding: const EdgeInsets.only(left: 16),
          child: SizedBox(
            width: 40,
            height: 40,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x29000000),
                    blurRadius: 4,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: ClipOval(
                child: Image.network(
                  'https://picsum.photos/seed/parent1/100/100',
                  fit: BoxFit.cover,
                  alignment: Alignment.center,
                ),
              ),
            ),
          ),
        ),
        actions: [
          IconButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Thông báo')),
              );
            },
            icon: const Icon(Icons.notifications_outlined),
            iconSize: 24,
            tooltip: 'Notifications',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          children: [
            const SizedBox(height: 24),
            // Status Section
            GestureDetector(
              onLongPress: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => const TestAlert(),
                );
              },
              child: const _StatusSection(),
            ),
            const SizedBox(height: 32),

            // Map Card
            const _MapCard(),
            const SizedBox(height: 32),

            // Beacon Strip
            const _BeaconStrip(),
            const SizedBox(height: 32),

            // Quick Actions
            const _QuickActions(),
            const SizedBox(height: 32),
          ],
        ),
      ),
      bottomNavigationBar: const AppBottomNav(),
    );
  }
}

class _StatusSection extends StatelessWidget {
  const _StatusSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFFCDE3DC),
            borderRadius: BorderRadius.circular(9999),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x0D000000),
                  blurRadius: 2,
                  offset: Offset(0, 1)),
            ],
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.verified_user, size: 20, color: Color(0xFF00391C)),
              SizedBox(width: 8),
              Text(
                'Đang an toàn',
                style: TextStyle(
                  fontFamily: 'Manrope',
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF00391C),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Column(
          children: [
            Text(
              'Bé Na',
              style: TextStyle(
                fontFamily: 'Plus Jakarta Sans',
                fontSize: 30,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.02,
                color: const Color(0xFF1E1E1E),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Còn Mẹ đang gần beacon',
              style: TextStyle(
                fontFamily: 'Manrope',
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF5e6059),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _MapCard extends StatefulWidget {
  const _MapCard();

  @override
  State<_MapCard> createState() => _MapCardState();
}

class _MapCardState extends State<_MapCard> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _floatController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat();
    _floatController = AnimationController(
      duration: const Duration(milliseconds: 3000),
      vsync: this,
    )..repeat(reverse: true);
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
        boxShadow: const [
          BoxShadow(
              color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            Positioned.fill(
              child: ColorFiltered(
                colorFilter:
                    const ColorFilter.mode(Color(0x33000000), BlendMode.darken),
                child: Image.network(
                  'https://picsum.photos/seed/map1/400/300',
                  fit: BoxFit.cover,
                ),
              ),
            ),
            // Beacon Point with animations
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return Transform.scale(
                        scale: 1.0 + (_pulseController.value * 0.8),
                        child: Opacity(
                          opacity: 0.4 * (1.0 - _pulseController.value),
                          child: Container(
                            width: 48,
                            height: 48,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0x334f635e),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  AnimatedBuilder(
                    animation: _floatController,
                    builder: (context, child) {
                      return Transform.translate(
                        offset: Offset(0, -4 + (_floatController.value * 8)),
                        child: child,
                      );
                    },
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF4f635e),
                        border: Border.all(color: Colors.white, width: 4),
                        boxShadow: const [
                          BoxShadow(
                              color: Color(0x33000000),
                              blurRadius: 12,
                              offset: Offset(0, 4)),
                        ],
                      ),
                      child: const Icon(Icons.child_care,
                          color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),
            // Last Seen Label
            Positioned(
              left: 16,
              right: 16,
              bottom: 16,
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
                        offset: Offset(0, 4)),
                  ],
                ),
                child: Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Vị trí gần nhất',
                            style: TextStyle(
                              fontFamily: 'Manrope',
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.1,
                              color: Color(0xFF5e6059),
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Phòng khách • 2 phút trước',
                            style: TextStyle(
                              fontFamily: 'Manrope',
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1E1E1E),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF4f635e),
                        boxShadow: const [
                          BoxShadow(
                              color: Color(0x1A000000),
                              blurRadius: 4,
                              offset: Offset(0, 2)),
                        ],
                      ),
                      child: const Icon(Icons.near_me,
                          color: Colors.white, size: 20),
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

class _BeaconStrip extends StatelessWidget {
  const _BeaconStrip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border:
            Border.all(color: const Color(0xFFE7E3DC).withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFCDE3DC),
            ),
            child:
                const Icon(Icons.sensors, color: Color(0xFF4f635e), size: 24),
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bé Na',
                  style: TextStyle(
                    fontFamily: 'Plus Jakarta Sans',
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E1E1E),
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Đang ở gần • 98% Pin',
                  style: TextStyle(
                    fontFamily: 'Manrope',
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF5e6059),
                  ),
                ),
              ],
            ),
          ),
          TextButton(
// @converge:element HomeScreen-TextButton-onPressed-1
            onPressed: () => context.push('/beacon/detail'),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Chi tiết beacon',
                  style: TextStyle(
                    fontFamily: 'Manrope',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF4f635e),
                  ),
                ),
                SizedBox(width: 4),
                Icon(Icons.chevron_right, size: 18, color: Color(0xFF4f635e)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tạm dừng thông báo',
            style: TextStyle(
              fontFamily: 'Plus Jakarta Sans',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.01,
              color: Color(0xFF1E1E1E),
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Tắt cảnh báo tạm thời khi bạn đang ở cùng bé.',
            style: TextStyle(
              fontFamily: 'Manrope',
              fontSize: 12,
              color: Color(0xFF5e6059),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _QuickActionButton(label: '5 phút')),
              const SizedBox(width: 12),
              Expanded(child: _QuickActionButton(label: '10 phút')),
              const SizedBox(width: 12),
              Expanded(child: _QuickActionButton(label: '15 phút')),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;

  const _QuickActionButton({required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(9999),
          border: Border.all(color: const Color(0xFFE7E3DC)),
          boxShadow: const [
            BoxShadow(
                color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1)),
          ],
        ),
        child: Center(
          child: Text(
            label,
            style: const TextStyle(
              fontFamily: 'Manrope',
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E1E1E),
            ),
          ),
        ),
      ),
    );
  }
}
