import 'package:flutter/material.dart';
import 'package:folio/theme/app_theme.dart';
import 'package:folio/widgets/trust_notes_container.dart';
import 'package:folio/widgets/privacy_footer.dart';
import 'widgets/pulse_avatar_badge.dart';

class InviteAcceptScreen extends StatefulWidget {
  const InviteAcceptScreen({super.key});

  @override
  State<InviteAcceptScreen> createState() => _InviteAcceptScreenState();
}

class _InviteAcceptScreenState extends State<InviteAcceptScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.brandSurfaceOpaque,
      appBar: AppBar(
        leading: IconButton(
// @converge:element InviteAcceptScreen-IconButton-onPressed-1
          onPressed: () => Navigator.of(context).pop(),
          icon: Icon(Icons.close, color: AppTheme.brandOnSurface),
          tooltip: 'Close',
        ),
        title: Text(
          'BabyGuard',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.02,
            color: AppTheme.brandOnSurface,
          ),
        ),
        centerTitle: true,
        backgroundColor: AppTheme.brandSurfaceOpaque,
        elevation: 0,
        scrolledUnderElevation: 0,
        toolbarHeight: 80,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(maxWidth: 400),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(AppTheme.radiusLg * 1.75),
              boxShadow: const [
                BoxShadow(
                  color: AppTheme.brandShadow,
                  blurRadius: 24,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.all(AppTheme.spaceXl * 1.5),
                  child: Column(
                    children: [
                      // Avatar with badge
                      PulseAvatarBadge(pulseAnimation: _pulseAnimation),
                      const SizedBox(height: AppTheme.spaceXl),
                      // Title & Inviter
                      Column(
                        children: [
                          Text(
                            'Bé Na',
                            style: Theme.of(context).textTheme.displaySmall?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.02,
                              color: AppTheme.brandOnSurface,
                            ),
                          ),
                          const SizedBox(height: AppTheme.spaceSm),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Mẹ đã mời bạn',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.brandOnSurfaceVariant,
                                ),
                              ),
                              const SizedBox(width: AppTheme.spaceSm),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.brandBorder,
                                  borderRadius:
                                      BorderRadius.circular(AppTheme.radiusFull),
                                ),
                                child: Text(
                                  'Người sở hữu',
                                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.05,
                                    color: AppTheme.brandOnSurfaceVariant,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: AppTheme.spaceXl),
                      Container(
                        height: 1,
                        color: AppTheme.brandBorder.withValues(alpha: 0.5),
                      ),
                      const SizedBox(height: AppTheme.spaceXl),
                      // Trust Notes
                      TrustNotesContainer(),
                      const SizedBox(height: AppTheme.spaceXl + 8),
                      // Action Buttons
                      Column(
                        children: [
// @converge:element InviteAcceptScreen-ElevatedButton-onPressed-1
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton(
                              onPressed: () {
                                Navigator.of(context).pop();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                        'Đã chấp nhận lời mời tham gia nhóm theo dõi'),
                                  ),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.brandOnSurface,
                                foregroundColor: Theme.of(context).colorScheme.surface,
                                shape: RoundedRectangleBorder(
                                  borderRadius:
                                      BorderRadius.circular(AppTheme.radiusFull),
                                ),
                              ),
                              child: Text(
                                'Chấp nhận',
                                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: AppTheme.spaceMd),
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: OutlinedButton(
// @converge:element InviteAcceptScreen-OutlinedButton-onPressed-1
                              onPressed: () {
                                Navigator.of(context).pop();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Đã từ chối lời mời'),
                                  ),
                                );
                              },
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppTheme.brandOnSurfaceVariant,
                                side: BorderSide(
                                  color: Theme.of(context).colorScheme.outline,
                                  width: 2,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius:
                                      BorderRadius.circular(AppTheme.radiusFull),
                                ),
                              ),
                              child: Text(
                                'Từ chối',
                                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Privacy Footer
                const PrivacyFooter(),
              ],
            ),
          ),
        ),
      ),
      // Status Indicator
      bottomNavigationBar: Container(
        padding: const EdgeInsets.only(bottom: 32),
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppTheme.spaceMd,
              vertical: AppTheme.spaceSm,
            ),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              boxShadow: const [
                BoxShadow(
                  color: AppTheme.brandShadowDark,
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.brandGreen,
                  ),
                ),
                const SizedBox(width: AppTheme.spaceSm),
                Text(
                  'HỆ THỐNG ĐANG HOẠT ĐỘNG',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.1,
                    color: AppTheme.brandOnSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}