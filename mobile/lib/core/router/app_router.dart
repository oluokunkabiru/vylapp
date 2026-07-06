import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/feed/presentation/screens/home_screen.dart';
import '../../features/feed/presentation/screens/vibe_detail_screen.dart';
import '../../features/spaces/presentation/screens/spaces_screen.dart';
import '../../features/spaces/presentation/screens/space_room_screen.dart';
import '../../features/messages/presentation/screens/conversations_screen.dart';
import '../../features/messages/presentation/screens/chat_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/autopilot/presentation/screens/autopilot_screen.dart';
import '../../features/creator/presentation/screens/creator_screen.dart';
import '../../features/raven/presentation/screens/raven_screen.dart';
import 'shell_screen.dart';

abstract final class Routes {
  static const login          = '/login';
  static const register       = '/register';
  static const home           = '/';
  static const vibeDetail     = '/vibes/:id';
  static const spaces         = '/spaces';
  static const spaceRoom      = '/spaces/:id';
  static const messages       = '/messages';
  static const chat           = '/messages/:id';
  static const notifications  = '/notifications';
  static const profile        = '/profile/:handle';
  static const myProfile      = '/profile';
  static const autopilot      = '/autopilot';
  static const creator        = '/creator';
  static const raven          = '/raven';
}

GoRouter buildRouter(AuthBloc authBloc) {
  return GoRouter(
    initialLocation: Routes.home,
    refreshListenable: _AuthNotifier(authBloc),
    redirect: (context, state) {
      final authState = authBloc.state;
      final isAuth    = authState is AuthAuthenticated;
      final isLoading = authState is AuthLoading || authState is AuthInitial;
      final onAuth    = state.matchedLocation == Routes.login ||
                        state.matchedLocation == Routes.register;

      if (isLoading) return null;
      if (!isAuth && !onAuth) return Routes.login;
      if (isAuth  &&  onAuth) return Routes.home;
      return null;
    },
    routes: [
      // ── Unauthenticated ───────────────────────────────────────────────────
      GoRoute(path: Routes.login,    builder: (c, s) => const LoginScreen()),
      GoRoute(path: Routes.register, builder: (c, s) => const RegisterScreen()),

      // ── Authenticated shell (bottom nav) ──────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => ShellScreen(child: child),
        routes: [
          GoRoute(
            path: Routes.home,
            builder: (c, s) => const HomeScreen(),
            routes: [
              GoRoute(
                path: 'vibes/:id',
                builder: (c, s) => VibeDetailScreen(vibeId: s.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: Routes.spaces,
            builder: (c, s) => const SpacesScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (c, s) => SpaceRoomScreen(spaceId: s.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: Routes.messages,
            builder: (c, s) => const ConversationsScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (c, s) => ChatScreen(conversationId: s.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: Routes.notifications, builder: (c, s) => const NotificationsScreen()),
          GoRoute(path: Routes.myProfile,     builder: (c, s) => const ProfileScreen()),
          GoRoute(
            path: '/profile/:handle',
            builder: (c, s) => ProfileScreen(handle: s.pathParameters['handle']),
          ),
          GoRoute(path: Routes.autopilot, builder: (c, s) => const AutopilotScreen()),
          GoRoute(path: Routes.creator,   builder: (c, s) => const CreatorScreen()),
          GoRoute(path: Routes.raven,     builder: (c, s) => const RavenScreen()),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      backgroundColor: const Color(0xFF08070F),
      body: Center(
        child: Text(
          'Page not found',
          style: const TextStyle(color: Colors.white70, fontFamily: 'Sora'),
        ),
      ),
    ),
  );
}

class _AuthNotifier extends ChangeNotifier {
  _AuthNotifier(AuthBloc bloc) {
    bloc.stream.listen((_) => notifyListeners());
  }
}
