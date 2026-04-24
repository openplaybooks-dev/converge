import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/overlays/pairing_confirmation/pairing_confirmation.dart';
import 'widgets/signal_bars.dart';

/// Beacon Scanner screen - discover and pair new BLE beacons
class BeaconScannerScreen extends StatefulWidget {
  const BeaconScannerScreen({super.key});

  @override
  State<BeaconScannerScreen> createState() => _BeaconScannerScreenState();
}

class _BeaconScannerScreenState extends State<BeaconScannerScreen>
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
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        toolbarHeight: 72,
        leading: IconButton(
// @converge:element BeaconScannerScreen-IconButton-onPressed-1
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back),
          color: colorScheme.onSurface,
        ),
        title: Text(
          'Quét Beacon',
          style: textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.02,
            color: colorScheme.onSurface,
          ),
        ),
        actions: [
          Container(
            width: 40,
            height: 40,
            margin: const EdgeInsets.only(right: 24),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: colorScheme.surfaceContainerHighest,
            ),
            child: ClipOval(
              child: Image.network(
                'https://picsum.photos/seed/parent2/100/100',
                fit: BoxFit.cover,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 48, 24, 180),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Editorial Header
            Text(
              'Thêm Beacon',
              style: textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: -0.02,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Đang tìm kiếm các thiết bị bảo vệ gần bạn để bắt đầu hành trình an tâm.',
              style: textTheme.bodyLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 64),
            // Radar Scanning Area
            Center(
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
                                color: colorScheme.outlineVariant
                                    .withValues(alpha: 0.2),
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
                          color:
                              colorScheme.outlineVariant.withValues(alpha: 0.4),
                          width: 2,
                        ),
                      ),
                    ),
                    Container(
                      width: 128,
                      height: 128,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color:
                            colorScheme.outlineVariant.withValues(alpha: 0.3),
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
                            color: colorScheme.shadow.withValues(alpha: 0.25),
                            blurRadius: 32,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.bluetooth_searching,
                        color: colorScheme.onPrimary,
                        size: 40,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            Center(
              child: Text(
                'ĐANG QUÉT THIẾT BỊ...',
                style: textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.1,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            const SizedBox(height: 64),
            // Discovered Devices Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Thiết bị tìm thấy',
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.01,
                    color: colorScheme.onSurface,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: colorScheme.tertiaryContainer,
                    borderRadius: BorderRadius.circular(9999),
                  ),
                  child: Text(
                    '3 Mới',
                    style: textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: colorScheme.onTertiaryContainer,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            // Device Card 1
            _DeviceCard(
              icon: Icons.child_care,
              name: 'Beacon: Bé Na',
              subtitle: 'Đồng bộ nhóm theo dõi • Đồng bộ',
              isPrimary: true,
              rssi: -42,
              signalStrength: 4,
              uuid: '...E2C4',
              major: '100',
              minor: '256',
            ),
            const SizedBox(height: 24),
            // Device Card 2
            const _DeviceCard(
              icon: Icons.sensors,
              name: 'Beacon #8210',
              subtitle: 'Đang chờ tín hiệu ổn định',
              isPrimary: false,
              rssi: -78,
              signalStrength: 2,
            ),
          ],
        ),
      ),
      bottomSheet: Padding(
        padding: const EdgeInsets.only(bottom: 128),
        child: Center(
          child: ElevatedButton.icon(
// @converge:element BeaconScannerScreen-ElevatedButton-onPressed-1
            onPressed: () {
              _radarController.reset();
              _radarController.forward();
            },
            icon: const Icon(Icons.refresh, size: 20),
            label: const Text('Quét lại'),
            style: ElevatedButton.styleFrom(
              backgroundColor: colorScheme.onSurface,
              foregroundColor: colorScheme.surface,
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 20),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(9999),
              ),
              elevation: 8,
            ),
          ),
        ),
      ),
    );
  }
}

class _DeviceCard extends StatelessWidget {
  final IconData icon;
  final String name;
  final String subtitle;
  final bool isPrimary;
  final int rssi;
  final int signalStrength;
  final String? uuid;
  final String? major;
  final String? minor;

  const _DeviceCard({
    required this.icon,
    required this.name,
    required this.subtitle,
    required this.isPrimary,
    required this.rssi,
    required this.signalStrength,
    this.uuid,
    this.major,
    this.minor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.15),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(16),
                ),
                child:
                    Icon(icon, color: colorScheme.onSurfaceVariant, size: 32),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.cloud,
                            size: 12, color: colorScheme.onSurfaceVariant),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            subtitle,
                            style: textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  SignalBars(strength: signalStrength),
                  const SizedBox(height: 4),
                  Text(
                    '$rssi RSSI',
                    style: textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.02,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (uuid != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color:
                    colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'UUID',
                          style: textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.05,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        Text(
                          uuid!,
                          style: textTheme.bodySmall?.copyWith(
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Major',
                          style: textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.05,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        Text(
                          major!,
                          style: textTheme.bodySmall?.copyWith(
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Minor',
                          style: textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.05,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        Text(
                          minor!,
                          style: textTheme.bodySmall?.copyWith(
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
// @converge:element BeaconScannerScreen-_DeviceCard-ElevatedButton-onPressed-1
              onPressed: () async {
                final result = await showModalBottomSheet<bool>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => const PairingConfirmation(),
                );
                if (result == true && context.mounted) {
                  // Handle confirmed pairing
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: colorScheme.onSurface,
                foregroundColor: colorScheme.surface,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(9999),
                ),
              ),
              child: Text(
                'Kết nối ngay',
                style: textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
