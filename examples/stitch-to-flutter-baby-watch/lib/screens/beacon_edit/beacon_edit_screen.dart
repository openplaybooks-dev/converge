import 'package:flutter/material.dart';
import '../../widgets/tx_power_field.dart';
import 'widgets/avatar_section.dart';
import 'widgets/delete_button.dart';
import 'widgets/major_minor_row.dart';

/// Beacon Edit screen - edit beacon name, icon, and configuration
class BeaconEditScreen extends StatefulWidget {
  const BeaconEditScreen({super.key});

  @override
  State<BeaconEditScreen> createState() => _BeaconEditScreenState();
}

class _BeaconEditScreenState extends State<BeaconEditScreen> {
  final _nameController = TextEditingController(text: 'Bé Na');
  final _majorController = TextEditingController(text: '10001');
  final _minorController = TextEditingController(text: '20002');
  final _txPowerController = TextEditingController(text: '-59');

  @override
  void dispose() {
    _nameController.dispose();
    _majorController.dispose();
    _minorController.dispose();
    _txPowerController.dispose();
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
        toolbarHeight: 96,
        leading: IconButton(
// @converge:element BeaconEditScreen-IconButton-onPressed-1
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back),
          color: colorScheme.onSurface,
          iconSize: 28,
        ),
        title: Text(
          'Chỉnh sửa Beacon',
          style: textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.02,
            color: colorScheme.onSurface,
          ),
        ),
        actions: [
          TextButton(
// @converge:element BeaconEditScreen-TextButton-onPressed-1
            onPressed: () {
              final name = _nameController.text;
              final major = _majorController.text;
              final minor = _minorController.text;
              final txPower = _txPowerController.text;
              Navigator.of(context).pop({
                'name': name,
                'major': major,
                'minor': minor,
                'txPower': txPower,
              });
            },
            child: Text(
              'Lưu',
              style: textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: colorScheme.primary,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 32, 24, 160),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Avatar Section
            const AvatarSection(),
            const SizedBox(height: 40),

            // Form Fields
            _buildLabel('Tên Beacon', textTheme, colorScheme),
            const SizedBox(height: 8),
            TextField(
              controller: _nameController,
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface,
              ),
              decoration: InputDecoration(
                filled: true,
                fillColor: colorScheme.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: colorScheme.outlineVariant),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: colorScheme.outlineVariant),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: colorScheme.primary, width: 2),
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
            ),
            const SizedBox(height: 24),

            _buildLabel('UUID', textTheme, colorScheme),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: colorScheme.outlineVariant),
              ),
              child: Text(
                'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
                style: textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                  fontFamily: 'monospace',
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Major/Minor Grid
            const MajorMinorRow(),
            const SizedBox(height: 24),

            // TX Power
            const TxPowerField(),
            const SizedBox(height: 48),

            // Delete Button
            const DeleteButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(
      String text, TextTheme textTheme, ColorScheme colorScheme,) {
    return Text(
      text.toUpperCase(),
      style: textTheme.labelSmall?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: 0.05,
        color: colorScheme.onSurfaceVariant,
      ),
    );
  }
}
