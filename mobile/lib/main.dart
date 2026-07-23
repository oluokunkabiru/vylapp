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
  // google-services.json/GoogleService-Info.plist are placeholders until a
  // real Firebase project is wired up (see README "Pending items"). Firebase
  // init and FCM registration talk to that project over the network, so with
  // placeholder credentials they throw — push notifications and crash
  // reporting are best-effort, never a reason the whole app fails to start.
  var firebaseReady = false;
  try {
    await Firebase.initializeApp();
    firebaseReady = true;
  } catch (e) {
    debugPrint('Firebase.initializeApp() failed — continuing without Firebase: $e');
  }

  // Route all Flutter errors to Crashlytics in release mode
  if (firebaseReady && !kDebugMode) {
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
  if (firebaseReady) {
    try {
      await getIt<FirebaseNotificationService>().initialise();
    } catch (e) {
      debugPrint('Push notification setup failed — continuing without it: $e');
    }
  }

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
