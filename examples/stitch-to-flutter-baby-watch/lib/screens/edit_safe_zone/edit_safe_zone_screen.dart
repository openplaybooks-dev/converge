import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_theme.dart';
import 'widgets/map_preview_card.dart';
import 'widgets/radius_selector.dart';
import 'widgets/active_toggle.dart';
import 'widgets/safe_zone_form_field.dart';
import 'package:folio/widgets/address_field.dart';
import 'widgets/delete_button.dart';

class EditSafeZoneScreen extends StatelessWidget {
  const EditSafeZoneScreen({super.key});

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
          'Chỉnh sửa vùng',
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
            SafeZoneFormField(
              label: 'Tên vùng',
              hint: 'Ví dụ: Nhà, Trường học',
              initialValue: 'Home',
            ),
            const SizedBox(height: AppTheme.spaceLg),
            const AddressField(
                initialValue: '123 Calm Valley Street, Serenity District'),
            const SizedBox(height: AppTheme.spaceLg),
            const RadiusSelector(selectedIndex: 1),
            const SizedBox(height: AppTheme.spaceLg),
            const ActiveToggle(),
            const SizedBox(height: AppTheme.spaceXl),
            DeleteButton(),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }
}
