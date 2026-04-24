import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:folio/theme/app_theme.dart';

/// Safe Zones screen - displays active safe zones with map and zone cards
class SafeZonesScreen extends StatelessWidget {
  const SafeZonesScreen({super.key});

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
        toolbarHeight: 80,
        leading: IconButton(
// @converge:element SafeZonesScreen-IconButton-onPressed-1
          onPressed: () => Scaffold.of(context).openDrawer(),
          icon: const Icon(Icons.menu),
          color: colorScheme.onSurface,
        ),
        title: Text(
          'Safe Zones',
          style: textTheme.titleLarge?.copyWith(
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          Container(
            width: 40,
            height: 40,
            margin: const EdgeInsets.only(right: 24),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: colorScheme.outline, width: 2),
            ),
            child: ClipOval(
              child: Image.network(
                'https://picsum.photos/seed/parent3/100/100',
                fit: BoxFit.cover,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppTheme.spaceXs),
            Text(
              'Guardian Overlook',
              style: textTheme.labelMedium?.copyWith(
                fontFamily: 'Manrope',
                fontWeight: FontWeight.w700,
                letterSpacing: 0.15,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppTheme.spaceMd),
            Text(
              'Peace of mind,\ndefined by boundaries.',
              style: textTheme.displaySmall?.copyWith(
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: FontWeight.w800,
                letterSpacing: -0.02,
                color: colorScheme.onSurface,
                height: 1.1,
              ),
            ),
            const SizedBox(height: AppTheme.spaceXl),
            _MiniMapCard(colorScheme: colorScheme),
            const SizedBox(height: AppTheme.spaceXl),
            _buildZonesSection(context),
            const SizedBox(height: AppTheme.spaceXl),
            _Insights(colorScheme: colorScheme, textTheme: textTheme),
            const SizedBox(height: 140),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
// @converge:element SafeZonesScreen-FloatingActionButton-extendedOnPressed-1
        onPressed: () => context.push('/safe-zones/add'),
        backgroundColor: colorScheme.onSurface,
        foregroundColor: colorScheme.onPrimary,
        elevation: 8,
        label: const Text(
          'Thêm vùng an toàn',
          style: TextStyle(
            fontFamily: 'Manrope',
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
        icon: const Icon(Icons.add),
      ),
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  static Widget _buildZonesSection(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Active Zones',
              style: textTheme.headlineSmall?.copyWith(
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: FontWeight.w700,
                letterSpacing: -0.01,
                color: colorScheme.onSurface,
              ),
            ),
            Text(
              'Scroll to explore',
              style: textTheme.bodySmall?.copyWith(
                fontFamily: 'Manrope',
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppTheme.spaceMd),
        _ZoneCard(
          colorScheme: colorScheme,
          icon: Icons.home,
          name: 'Home',
          radius: '200m',
          address: '123 Calm Valley Street, Serenity District',
          isActive: true,
        ),
        const SizedBox(height: AppTheme.spaceMd),
        _ZoneCard(
          colorScheme: colorScheme,
          icon: Icons.school,
          name: 'School',
          radius: '500m',
          address: '456 Bright Minds Academy, Knowledge Ave',
          isActive: true,
        ),
        const SizedBox(height: AppTheme.spaceMd),
        _ZoneCard(
          colorScheme: colorScheme,
          icon: Icons.favorite,
          name: "Grandma's House",
          radius: '150m',
          address: '789 Orchard Grove, Heritage Park',
          isActive: false,
        ),
      ],
    );
  }

  static Widget _buildBottomNav(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.9),
        boxShadow: [
          BoxShadow(
            color: AppTheme.brandShadowDark,
            blurRadius: 32,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: SafeArea(
        child: Container(
          height: 80,
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceMd),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(
                colorScheme: colorScheme,
                icon: Icons.home_outlined,
                label: 'Trang chủ',
                isSelected: false,
                onTap: () => context.push('/'),
              ),
              // @converge:element SafeZonesScreen-_NavItem-onTap-2
              _NavItem(
                colorScheme: colorScheme,
                icon: Icons.devices_outlined,
                label: 'Thiết bị',
                isSelected: false,
                onTap: () => context.push('/scan'),
              ),
              // @converge:element SafeZonesScreen-_NavItem-onTap-3
              _NavItem(
                colorScheme: colorScheme,
                icon: Icons.security,
                label: 'An toàn',
                isSelected: true,
                onTap: () => context.push('/safe-zones'),
              ),
              // @converge:element SafeZonesScreen-_NavItem-onTap-4
              _NavItem(
                colorScheme: colorScheme,
                icon: Icons.settings_outlined,
                label: 'Cài đặt',
                isSelected: false,
                onTap: () => context.push('/settings'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// @converge:element SafeZonesScreen-_NavItem-onTap-1
class _NavItem extends StatelessWidget {
  final ColorScheme colorScheme;
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback? onTap;

  const _NavItem({
    required this.colorScheme,
    required this.icon,
    required this.label,
    required this.isSelected,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = isSelected
        ? AppTheme.brandGreen
        : colorScheme.onSurfaceVariant.withValues(alpha: 0.6);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 26, color: color),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontFamily: 'Manrope',
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniMapCard extends StatelessWidget {
  final ColorScheme colorScheme;

  const _MiniMapCard({required this.colorScheme});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: const [
          BoxShadow(
            color: AppTheme.brandShadow,
            blurRadius: 24,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: Column(
          children: [
            Container(
              height: 256,
              color: AppTheme.brandSurfaceContainer,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Image.network(
                      'https://picsum.photos/seed/map2/400/300',
                      fit: BoxFit.cover,
                      color: AppTheme.brandImageOverlay,
                      colorBlendMode: BlendMode.darken,
                    ),
                  ),
                  Center(
                    child: SizedBox(
                      width: 192,
                      height: 192,
                      child: Stack(
                        children: [
                          Positioned(
                            top: 0,
                            left: 0,
                            child: Container(
                              width: 128,
                              height: 128,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppTheme.brandGreen.withValues(alpha: 0.2),
                                border: Border.all(
                                    color: AppTheme.brandGreen, width: 2),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 16,
                            right: 0,
                            child: Container(
                              width: 112,
                              height: 112,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppTheme.brandOnSurfaceVariant.withValues(alpha: 0.1),
                                border: Border.all(
                                    color: AppTheme.brandOnSurfaceVariant.withValues(alpha: 0.3), width: 2),
                              ),
                            ),
                          ),
                          Positioned(
                            top: 40,
                            right: 16,
                            child: Container(
                              width: 96,
                              height: 96,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppTheme.brandLightGreenOverlay,
                                border: Border.all(
                                    color: AppTheme.brandGreen, width: 2),
                              ),
                            ),
                          ),
                          Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppTheme.brandOnSurface,
                                  ),
                                  child: ClipOval(
                                    child: Image.network(
                                      'https://picsum.photos/seed/baby1/100/100',
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                ),
                                Container(
                                  width: 12,
                                  height: 12,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppTheme.brandOnSurface,
                                    boxShadow: const [
                                      BoxShadow(
                                        color: AppTheme.brandShadowDark,
                                        blurRadius: 2,
                                      ),
                                    ],
                                  ),
                                  transform: Matrix4.rotationZ(0.785398),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 16,
                    child: Container(
                      padding: const EdgeInsets.all(AppTheme.spaceMd),
                      decoration: BoxDecoration(
                        color: AppTheme.white80,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.verified_user,
                            color: AppTheme.brandGreen,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Tracking Active',
                                  style: TextStyle(
                                    fontFamily: 'Manrope',
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.brandOnSurface,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '3 Active Zones Monitored',
                                  style: TextStyle(
                                    fontFamily: 'Manrope',
                                    fontSize: 10,
                                    color: AppTheme.brandOnSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.brandLightGreen,
                              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                            ),
                            child: const Text(
                              'LIVE',
                              style: TextStyle(
                                fontFamily: 'Manrope',
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.brandGreen,
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
          ],
        ),
      ),
    );
  }
}

class _ZoneCard extends StatelessWidget {
  final ColorScheme colorScheme;
  final IconData icon;
  final String name;
  final String radius;
  final String address;
  final bool isActive;

  const _ZoneCard({
    required this.colorScheme,
    required this.icon,
    required this.name,
    required this.radius,
    required this.address,
    required this.isActive,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: const [
          BoxShadow(
            color: AppTheme.brandShadow,
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.brandSurface,
            ),
            child: Icon(icon, color: AppTheme.brandOnSurface, size: 24),
          ),
          const SizedBox(width: AppTheme.spaceMd),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      name,
                      style: textTheme.titleMedium?.copyWith(
                        fontFamily: 'Plus Jakarta Sans',
                        fontWeight: FontWeight.w700,
                        color: AppTheme.brandOnSurface,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: isActive
                            ? AppTheme.brandLightGreen
                            : AppTheme.brandBorder,
                        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                      ),
                      child: Text(
                        radius,
                        style: TextStyle(
                          fontFamily: 'Manrope',
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: isActive
                              ? AppTheme.brandGreen
                              : AppTheme.brandOnSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  address,
                  style: textTheme.bodyMedium?.copyWith(
                    fontFamily: 'Manrope',
                    color: AppTheme.brandOnSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: AppTheme.spaceMd),
          Container(
            width: 48,
            height: 24,
            decoration: BoxDecoration(
              color:
                  isActive ? AppTheme.brandGreen : AppTheme.brandBorder,
              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            ),
            alignment: isActive ? Alignment.centerRight : Alignment.centerLeft,
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Container(
              width: 16,
              height: 16,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.white,
              ),
            ),
          ),
          const SizedBox(width: 8),
          // @converge:element SafeZonesScreen-_ZoneCard-IconButton-onPressed-1
          IconButton(
            onPressed: () => context.push('/safe-zones/:id/edit'),
            icon: const Icon(
              Icons.edit,
              color: AppTheme.brandBorder,
              size: 20,
            ),
          ),
        ],
      ),
    );
  }
}

class _Insights extends StatelessWidget {
  final ColorScheme colorScheme;
  final TextTheme textTheme;

  const _Insights({
    required this.colorScheme,
    required this.textTheme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            decoration: BoxDecoration(
              color: AppTheme.brandSurface,
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.notifications_active,
                    color: AppTheme.brandOnSurfaceVariant, size: 24),
                const SizedBox(height: 8),
                Text(
                  '24 Alerts',
                  style: textTheme.titleLarge?.copyWith(
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: FontWeight.w700,
                    color: AppTheme.brandOnSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  "This week's entry/exit events",
                  style: textTheme.bodySmall?.copyWith(
                    fontFamily: 'Manrope',
                    color: AppTheme.brandOnSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: AppTheme.spaceMd),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            decoration: BoxDecoration(
              color: AppTheme.brandLightGreen,
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.battery_full,
                    color: AppTheme.brandGreen, size: 24),
                const SizedBox(height: 8),
                Text(
                  '98% Secure',
                  style: textTheme.titleLarge?.copyWith(
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: FontWeight.w700,
                    color: AppTheme.brandGreen,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Optimal zone coverage',
                  style: textTheme.bodySmall?.copyWith(
                    fontFamily: 'Manrope',
                    color: AppTheme.brandGreen,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}