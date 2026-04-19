import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:folio/theme/app_theme.dart';

/// Bottom-sheet overlay for logging a weight measurement.
///
/// Returns a [Map] with keys `value` (double), `date` (DateTime),
/// and optionally `notes` (String) via [Navigator.pop], or `null`
/// if dismissed without saving.
class WeightEntry extends StatefulWidget {
  const WeightEntry({super.key});

  @override
  State<WeightEntry> createState() => _WeightEntryState();
}

class _WeightEntryState extends State<WeightEntry> {
  final _weightController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime _selectedDate = DateTime.now();

  @override
  void dispose() {
    _weightController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  void _save() {
    final weight = double.tryParse(_weightController.text);
    if (weight == null || weight <= 0) return;
    Navigator.pop(context, {
      'value': weight,
      'date': _selectedDate,
      'notes': _notesController.text.isEmpty ? null : _notesController.text,
    });
  }

  String _formatDate(DateTime date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;

    final inputBorder = BoxDecoration(
      color: AppTheme.surfaceTertiaryColor,
      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
      border: Border.all(
        color: AppTheme.textPrimaryColor.withValues(alpha: 0.06),
      ),
    );

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.only(bottom: AppTheme.spaceLg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            Padding(
              padding: const EdgeInsets.only(
                left: AppTheme.screenHPadding,
                right: AppTheme.screenHPadding,
                top: AppTheme.spaceMd,
                bottom: AppTheme.spaceLg,
              ),
              child: Text(
                'Log Weight',
                style: textTheme.titleLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
              ),
            ),

            // Content
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.screenHPadding,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Weight Input
                  Text(
                    'Weight',
                    style: textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                  const SizedBox(height: AppTheme.spaceSm),
                  Semantics(
                    label: 'Enter weight in kg',
                    child: Container(
                      decoration: inputBorder,
                      constraints: const BoxConstraints(minHeight: 44),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppTheme.screenHPadding,
                        vertical: AppTheme.spaceSm + 4,
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _weightController,
                              keyboardType: const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                              inputFormatters: [
                                FilteringTextInputFormatter.allow(
                                  RegExp(r'^\d*\.?\d*'),
                                ),
                              ],
                              style: textTheme.displaySmall?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: colorScheme.onSurface,
                                letterSpacing: -0.015 * 36,
                              ),
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: EdgeInsets.zero,
                                hintText: '0.0',
                                filled: false,
                              ),
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                          Text(
                            'kg',
                            style: textTheme.labelLarge?.copyWith(
                              color: AppTheme.textSecondaryColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: AppTheme.spaceMd),

                  // Date Selector
                  Text(
                    'Date',
                    style: textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                  const SizedBox(height: AppTheme.spaceSm),
                  Semantics(
                    label: 'Select date. Currently ${_formatDate(_selectedDate)}',
                    button: true,
                    child: InkWell(
                        onTap: _pickDate,
                        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                        child: Container(
                          decoration: inputBorder,
                          constraints: const BoxConstraints(minHeight: 44),
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppTheme.screenHPadding,
                            vertical: AppTheme.spaceSm + 4,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _formatDate(_selectedDate),
                                  style: textTheme.bodySmall?.copyWith(
                                    color: colorScheme.onSurface,
                                  ),
                                ),
                              ),
                              const Icon(
                                Icons.calendar_today,
                                size: 20,
                                color: AppTheme.textSecondaryColor,
                              ),
                            ],
                          ),
                        ),
                      ),
                  ),

                  const SizedBox(height: AppTheme.spaceMd),

                  // Notes Field
                  Text(
                    'Notes (optional)',
                    style: textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                  const SizedBox(height: AppTheme.spaceSm),
                  Semantics(
                    label: 'Optional notes',
                    child: Container(
                      decoration: inputBorder,
                      constraints: const BoxConstraints(minHeight: 44),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppTheme.screenHPadding,
                        vertical: AppTheme.spaceSm + 4,
                      ),
                      child: TextField(
                        controller: _notesController,
                        maxLines: 3,
                        style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface,
                        ),
                        decoration: InputDecoration(
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                          hintText: 'Add a note...',
                          hintStyle: textTheme.bodySmall?.copyWith(
                            color: AppTheme.textSecondaryColor.withValues(
                              alpha: 0.7,
                            ),
                          ),
                          filled: false,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: AppTheme.spaceLg),

                  // Save Button
                  Semantics(
                    label: 'Save weight entry',
                    button: true,
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _weightController.text.isEmpty
                            ? null
                            : _save,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.coralColor,
                          foregroundColor: AppTheme.surfaceColor,
                          disabledBackgroundColor:
                              AppTheme.coralColor.withValues(alpha: 0.4),
                          disabledForegroundColor:
                              AppTheme.surfaceColor.withValues(alpha: 0.4),
                          shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(AppTheme.radiusFull),
                          ),
                        ),
                        child: Text(
                          'Save',
                          style: textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppTheme.surfaceColor,
                          ),
                        ),
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
