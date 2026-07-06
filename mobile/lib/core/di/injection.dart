import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import '../security/security_service.dart';
import '../security/token_service.dart';
import '../network/api_client.dart';
import '../network/socket_service.dart';
import '../utils/input_sanitiser.dart';
import '../firebase/notification_service.dart';
import '../hardware/hardware_bridge.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/feed/presentation/bloc/feed_bloc.dart';

/// Service locator — manually wired to avoid build_runner overhead.
/// For a larger team, switch to @injectable + @InjectableInit.
final getIt = GetIt.instance;

void configureDependencies() {
  // ── Infrastructure ────────────────────────────────────────────────────────
  getIt.registerLazySingleton(() => const FlutterSecureStorage());
  getIt.registerLazySingleton(() => SecurityService());
  getIt.registerLazySingleton(() => TokenService(getIt()));
  getIt.registerLazySingleton(() => InputSanitiser());
  getIt.registerLazySingleton(() => ApiClient(getIt()));
  getIt.registerLazySingleton(() => SocketService(getIt()));
  getIt.registerLazySingleton(() => FirebaseNotificationService(getIt()));
  getIt.registerLazySingleton(() => HardwareBridge());

  // ── BLoCs ─────────────────────────────────────────────────────────────────
  // Registered as factories so a new BLoC is created each time
  // (except AuthBloc which is singleton-by-usage in app.dart)
  getIt.registerFactory(() => AuthBloc(getIt(), getIt(), getIt(), getIt()));
  getIt.registerFactory(() => FeedBloc(getIt(), getIt()));
}
