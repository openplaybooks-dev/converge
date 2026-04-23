import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/home/home_screen.dart';
import '../screens/beacon_scanner/beacon_scanner_screen.dart';
import '../screens/beacon_detail/beacon_detail_screen.dart';
import '../screens/beacon_edit/beacon_edit_screen.dart';
import '../screens/safe_zones/safe_zones_screen.dart';
import '../screens/add_safe_zone/add_safe_zone_screen.dart';
import '../screens/edit_safe_zone/edit_safe_zone_screen.dart';
import '../screens/alert/alert_screen.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/guardians/guardians_screen.dart';
import '../screens/invite_accept/invite_accept_screen.dart';
import '../screens/history/history_screen.dart';
import '../screens/pairing_confirmation/pairing_confirmation_screen.dart';
import '../screens/timeout_picker/timeout_picker_screen.dart';
import '../screens/beacon_forget_confirmation/beacon_forget_confirmation_screen.dart';
import '../screens/test_alert/test_alert_screen.dart';
import '../screens/event_detail/event_detail_screen.dart';
import '../screens/filter_date/filter_date_screen.dart';
import '../screens/filter_date_range/filter_date_range_screen.dart';
import '../screens/beacon_pairing_confirmation/beacon_pairing_confirmation_screen.dart';
import '../screens/event_delete_confirmation/event_delete_confirmation_screen.dart';
import '../screens/safe_zone_delete_confirmation/safe_zone_delete_confirmation_screen.dart';
import '../screens/test_alert_countdown/test_alert_countdown_screen.dart';
import '../screens/settings/settings_screen.dart';

/// GoRouter configuration.
/// Routes are added by the 03-build-screens epic as screens are generated.
final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/scan',
      builder: (context, state) => const BeaconScannerScreen(),
    ),
    GoRoute(
      path: '/beacon/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return BeaconDetailScreen(key: Key('beacon-$id'));
      },
    ),
    GoRoute(
      path: '/beacon/:id/edit',
      builder: (context, state) => const BeaconEditScreen(),
    ),
    GoRoute(
      path: '/safe-zones',
      builder: (context, state) => const SafeZonesScreen(),
    ),
    GoRoute(
      path: '/safe-zones/add',
      builder: (context, state) => const AddSafeZoneScreen(),
    ),
    GoRoute(
      path: '/safe-zones/:id/edit',
      builder: (context, state) => const EditSafeZoneScreen(),
    ),
    GoRoute(
      path: '/alert',
      builder: (context, state) => const AlertScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/guardians',
      builder: (context, state) => const GuardiansScreen(),
    ),
    GoRoute(
      path: '/invite/:code',
      builder: (context, state) {
        final code = state.pathParameters['code'] ?? '';
        return InviteAcceptScreen(key: Key('invite-$code'));
      },
    ),
    GoRoute(
      path: '/history',
      builder: (context, state) => const HistoryScreen(),
    ),
    GoRoute(
      path: '/pairing-confirmation',
      builder: (context, state) => const PairingConfirmationScreen(),
    ),
    GoRoute(
      path: '/timeout-picker',
      builder: (context, state) => const TimeoutPickerScreen(),
    ),
    GoRoute(
      path: '/beacon-forget-confirmation',
      builder: (context, state) => const BeaconForgetConfirmationScreen(),
    ),
    GoRoute(
      path: '/test-alert',
      builder: (context, state) => const TestAlertScreen(),
    ),
    GoRoute(
      path: '/event-detail',
      builder: (context, state) => const EventDetailScreen(),
    ),
    GoRoute(
      path: '/filter-date',
      builder: (context, state) => const FilterDateScreen(),
    ),
    GoRoute(
      path: '/filter-date-range',
      builder: (context, state) => const FilterDateRangeScreen(),
    ),
    GoRoute(
      path: '/beacon-pairing-confirmation',
      builder: (context, state) => const BeaconPairingConfirmationScreen(),
    ),
    GoRoute(
      path: '/event-delete-confirmation',
      builder: (context, state) => const EventDeleteConfirmationScreen(),
    ),
    GoRoute(
      path: '/safe-zone-delete-confirmation',
      builder: (context, state) => const SafeZoneDeleteConfirmationScreen(),
    ),
    GoRoute(
      path: '/test-alert-countdown',
      builder: (context, state) => const TestAlertCountdownScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
  ],
);
