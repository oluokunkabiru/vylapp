import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/security/security_service.dart';
import 'core/di/injection.dart';
import 'core/firebase/notification_service.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ── Firebase ──────────────────────────────────────────────────────────────
  await Firebase.initializeApp();

  // Route all Flutter errors to Crashlytics in release mode
  if (!kDebugMode) {
    FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };
  }

  // ── Dependency injection ──────────────────────────────────────────────────
  configureDependencies();

  // ── Security integrity check ──────────────────────────────────────────────
  final security = getIt<SecurityService>();
  final report   = await security.initialise();
  // report.isRooted → show a warning dialog in VylApp, not a block
  // report.hasDebugger → only true in debug/profile builds

  // ── Push notifications ─────────────────────────────────────────────────────
  await getIt<FirebaseNotificationService>().initialise();

  // ── Lock orientation (mobile — portrait primary) ──────────────────────────
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // ── Status bar appearance ─────────────────────────────────────────────────
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor:      Colors.transparent,
    statusBarIconBrightness: Brightness.light, // white icons on dark bg
  ));

  runApp(VylApp(securityReport: report));
}
