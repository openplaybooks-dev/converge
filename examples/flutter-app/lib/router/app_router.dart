import 'package:go_router/go_router.dart';

/// GoRouter configuration.
/// Routes are added by the 03-build-screens epic as screens are generated.
final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    // Routes will be added here by the harness pipeline.
    // Example:
    // GoRoute(
    //   path: '/',
    //   builder: (context, state) => const HomeFeedScreen(),
    // ),
  ],
);
