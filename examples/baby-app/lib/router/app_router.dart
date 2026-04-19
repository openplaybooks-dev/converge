import 'package:go_router/go_router.dart';

import '../screens/cycle_tracking/cycle_tracking_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/exercise_detail/exercise_detail_screen.dart';
import '../screens/mindfulness/mindfulness_screen.dart';
import '../screens/pregnancy_progress/pregnancy_progress_screen.dart';
import '../screens/health_log/health_log_screen.dart';
import '../screens/mood_wellness/mood_wellness_screen.dart';
import '../screens/weight_nutrition/weight_nutrition_screen.dart';
import '../screens/education/education_screen.dart';
import '../screens/article_reader/article_reader_screen.dart';
import '../screens/settings/settings_screen.dart';

/// GoRouter configuration.
/// Routes are added by the 03-build-screens epic as screens are generated.
final GoRouter appRouter = GoRouter(
  initialLocation: '/home',
  routes: [
    GoRoute(
      path: '/home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/cycle',
      builder: (context, state) => const CycleTrackingScreen(),
    ),
    GoRoute(
      path: '/weight',
      builder: (context, state) => const WeightNutritionScreen(),
    ),
    GoRoute(
      path: '/progress',
      builder: (context, state) => const PregnancyProgressScreen(),
    ),
    GoRoute(
      path: '/mindfulness',
      builder: (context, state) => const MindfulnessScreen(),
    ),
    GoRoute(
      path: '/mindfulness/exercise/:id',
      builder: (context, state) => const ExerciseDetailScreen(),
    ),
    GoRoute(
      path: '/health-log',
      builder: (context, state) => const HealthLogScreen(),
    ),
    GoRoute(
      path: '/mood',
      builder: (context, state) => const MoodWellnessScreen(),
    ),
    GoRoute(
      path: '/education',
      builder: (context, state) => const EducationScreen(),
    ),
    GoRoute(
      path: '/education/article/:id',
      builder: (context, state) => const ArticleReaderScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
  ],
);
