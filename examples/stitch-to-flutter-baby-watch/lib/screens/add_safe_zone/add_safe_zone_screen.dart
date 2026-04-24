import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';
import '../../widgets/address_field.dart';
import 'widgets/map_preview_card.dart';
import 'widgets/radius_selector.dart';
import '../../widgets/active_toggle.dart';
import '../../widgets/safe_zone_form_field.dart';

class AddSafeZoneScreen extends StatelessWidget {
  const AddSafeZoneScreen({super.key});

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
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back),
          color: AppTheme.brandOnSurface,
        ),
        title: Text(
          'Thêm vùng an toàn',
          style: textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.02,
            color: AppTheme.brandOnSurface,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => throw UnimplementedError(),
            child: Text(
              'Lưu',
              style: textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppTheme.brandGreen,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppTheme.spaceMd),
            const MapPreviewCard(),
            const SizedBox(height: AppTheme.spaceLg),
            // Form Fields
            SafeZoneFormField(
              label: 'Tên vùng',
              hint: 'Ví dụ: Nhà, Trường học',
            ),
            const SizedBox(height: AppTheme.spaceLg),
            const AddressField(),
            const SizedBox(height: AppTheme.spaceLg),
            const RadiusSelector(),
            const SizedBox(height: AppTheme.spaceLg),
            const ActiveToggle(),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }
}
