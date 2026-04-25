import 'package:go_router/go_router.dart';

import '../screens/add_beacon/add_beacon_screen.dart';
import '../screens/beacon_detail/beacon_detail_screen.dart';
import '../screens/co_guardians_list/co_guardians_list_screen.dart';
import '../screens/history/history_screen.dart';
import '../screens/home/home_screen.dart';
import '../state/home_alert_phase.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/safe_zones/safe_zones_screen.dart';
import '../screens/settings/settings_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: <RouteBase>[
    GoRoute(
      path: '/',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) {
        final phaseParam = state.uri.queryParameters['phase'];
        if (phaseParam == null) return const HomeScreen();
        final initial = HomeAlertPhase.values.firstWhere(
          (p) => p.name == phaseParam,
          orElse: () => HomeAlertPhase.idle,
        );
        return HomeScreen(initialPhase: initial);
      },
    ),
    GoRoute(
      path: '/devices',
      builder: (context, state) => const BeaconDetailScreen(),
    ),
    GoRoute(
      path: '/devices/add',
      builder: (context, state) => const AddBeaconScreen(),
    ),
    GoRoute(
      path: '/devices/co-guardians',
      builder: (context, state) => const CoGuardiansListScreen(),
    ),
    GoRoute(
      path: '/safe-zones',
      builder: (context, state) => const SafeZonesScreen(),
    ),
    GoRoute(
      path: '/history',
      builder: (context, state) => const HistoryScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
  ],
);
