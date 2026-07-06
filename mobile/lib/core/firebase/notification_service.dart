import 'dart:async';
import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:injectable/injectable.dart';
import '../network/api_client.dart';

/// Firebase Cloud Messaging service.
///
/// Architecture decisions:
///   - FCM is the delivery mechanism for offline/background notifications.
///   - Socket.IO handles online/foreground real-time updates (badges, counters).
///   - We never send notification content through FCM data payloads alone;
///     we use a "ping + fetch" pattern: FCM wakes the app, the app fetches
///     from the REST API. This prevents notification content from being
///     intercepted at the FCM layer.
///   - The FCM token is registered server-side so the backend can target
///     the correct device. Tokens rotate — we re-register on every app start.
///   - Web notifications use the firebase-messaging-sw.js service worker.
///     See /web/firebase-messaging-sw.js for the web implementation.
@lazySingleton
class FirebaseNotificationService {
  FirebaseNotificationService(this._api);

  final ApiClient _api;
  final _messaging    = FirebaseMessaging.instance;
  final _localNotifs  = FlutterLocalNotificationsPlugin();

  // Broadcast stream — other parts of the app subscribe to this
  final _notifStream = StreamController<VylNotification>.broadcast();
  Stream<VylNotification> get onNotification => _notifStream.stream;

  // ── Initialise ────────────────────────────────────────────────────────────
  /// Call from main() after Firebase.initializeApp().
  Future<void> initialise() async {
    await _requestPermissions();
    await _configureLocalNotifications();
    _registerForegroundHandler();
    _registerBackgroundHandler();
    await _registerToken();
    _handleInitialMessage();
  }

  Future<void> _requestPermissions() async {
    final settings = await _messaging.requestPermission(
      alert:         true,
      announcement:  false,
      badge:         true,
      carPlay:       false,
      criticalAlert: false,
      provisional:   false,
      sound:         true,
    );
    // We do not block the user if they deny — we just won't show notifications.
    // Never gate app functionality on notification permission.
  }

  Future<void> _configureLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false, // Already requested via FCM
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    await _localNotifs.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
      onDidReceiveNotificationResponse: _onLocalNotifTapped,
    );

    // Create the Android notification channel — must match what the backend sends
    await _localNotifs
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(const AndroidNotificationChannel(
        'vylapp_high',              // id — must match backend FCM channel_id
        'Vylapp Notifications',    // name (shown in Android settings)
        description: 'Likes, comments, follows, messages, and Space alerts',
        importance: Importance.high,
        playSound: true,
        enableLights: true,
        ledColor: Color(0xFF7C3AED), // Vylapp violet
      ));
  }

  void _registerForegroundHandler() {
    // When the app is in the foreground, FCM does NOT show a notification
    // automatically on Android. We show it via flutter_local_notifications.
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notif = _parse(message);
      _notifStream.add(notif);
      _showLocalNotification(message);
    });
  }

  void _registerBackgroundHandler() {
    // Background handler MUST be a top-level function (not a class method)
    // because it runs in an isolate. See top of file.
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);
  }

  Future<void> _registerToken() async {
    final token = await _messaging.getToken();
    if (token == null) return;
    _sendTokenToServer(token);

    // Re-register when token rotates
    _messaging.onTokenRefresh.listen(_sendTokenToServer);
  }

  void _sendTokenToServer(String token) {
    _api.patch('/users/me', body: {'fcmToken': token}).catchError((_) {});
  }

  void _handleInitialMessage() {
    FirebaseMessaging.instance.getInitialMessage().then((message) {
      if (message != null) _notifStream.add(_parse(message));
    });

    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _notifStream.add(_parse(message));
    });
  }

  // ── Local notification display ─────────────────────────────────────────────
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notif = message.notification;
    if (notif == null) return;

    await _localNotifs.show(
      message.hashCode,
      notif.title ?? 'Vylapp',
      notif.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          'vylapp_high',
          'Vylapp Notifications',
          channelDescription: 'Likes, comments, follows, messages, and Space alerts',
          importance: Importance.high,
          priority: Priority.high,
          color: const Color(0xFF7C3AED),
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: jsonEncode(message.data),
    );
  }

  void _onLocalNotifTapped(NotificationResponse response) {
    if (response.payload == null) return;
    try {
      final data = jsonDecode(response.payload!) as Map<String, dynamic>;
      _notifStream.add(VylNotification(
        type:     data['type'] as String? ?? 'system',
        entityId: data['entity_id'] as String?,
        route:    data['route'] as String?,
        fromTap:  true,
      ));
    } catch (_) {}
  }

  VylNotification _parse(RemoteMessage message) => VylNotification(
    type:     message.data['type'] as String? ?? 'system',
    entityId: message.data['entity_id'] as String?,
    route:    message.data['route'] as String?,
    title:    message.notification?.title,
    body:     message.notification?.body,
    fromTap:  false,
  );
}

// ── Background handler — MUST be top-level ────────────────────────────────────
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  // Only initialise Firebase — do not call any injected services here
  // because the DI container is not available in the background isolate.
  await Firebase.initializeApp();
}

// ── Notification model ────────────────────────────────────────────────────────
class VylNotification {
  final String  type;
  final String? entityId;
  final String? route;
  final String? title;
  final String? body;
  final bool    fromTap;

  const VylNotification({
    required this.type,
    this.entityId,
    this.route,
    this.title,
    this.body,
    this.fromTap = false,
  });
}
