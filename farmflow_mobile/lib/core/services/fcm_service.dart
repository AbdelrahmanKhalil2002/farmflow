import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../utils/scaffold_messenger_key.dart';

// ── Background message handler (top-level, outside any class) ────────────────
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase is already initialised before this is called.
  // No UI work here — just silent data processing if needed.
}

// ── Local-notifications helper ────────────────────────────────────────────────

/// Wraps [FlutterLocalNotificationsPlugin] setup so [FcmService] stays clean.
class _LocalNotif {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _ready = false;

  /// Android high-importance channel used for all foreground notifications.
  static const _androidChannel = AndroidNotificationChannel(
    'farmflow_channel',   // id
    'FarmFlow',           // human-readable name shown in Settings
    importance: Importance.max,
    playSound: true,
  );

  static Future<void> init() async {
    // Android: create the channel first so notifications are not silenced.
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidChannel);

    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    );

    await _plugin.initialize(initSettings);
    _ready = true;
  }

  /// Shows a heads-up notification. Returns false if not initialised.
  static Future<bool> show({
    required int id,
    required String title,
    required String body,
  }) async {
    if (!_ready) return false;

    await _plugin.show(
      id,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannel.id,
          _androidChannel.name,
          importance: Importance.max,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
    );
    return true;
  }
}

/// Initialises FCM, requests permission, registers the token with the backend,
/// and wires up foreground + tap handlers for deep-link routing.
class FcmService {
  FcmService(this._dio);
  final Dio _dio;

  static final _fcm = FirebaseMessaging.instance;
  static int _notifId = 0; // auto-increment so each notification is distinct

  Future<void> init(GoRouter router) async {
    // Register background handler first
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Initialise local notifications (best-effort; failures are caught below)
    try {
      await _LocalNotif.init();
    } catch (_) {
      // Local notifications unavailable — will fall back to SnackBar
    }

    // Request permission (iOS shows native dialog; Android 13+ also needs it)
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    // Upload token to backend (fire-and-forget)
    final token = await _fcm.getToken();
    if (token != null) await _registerToken(token);

    // Re-register when token rotates
    _fcm.onTokenRefresh.listen(_registerToken);

    // Foreground messages — show a native-style heads-up notification
    FirebaseMessaging.onMessage.listen((message) {
      _showLocalNotif(message, router);
    });

    // Tapped notification while app was in background (resumed)
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _navigate(message, router);
    });

    // App launched from a terminated state via notification tap
    final initial = await _fcm.getInitialMessage();
    if (initial != null) _navigate(initial, router);
  }

  Future<void> _registerToken(String token) async {
    try {
      await _dio.patch(ApiEndpoints.fcmToken, data: {'token': token});
    } catch (_) {}
  }

  /// Shows a native-style heads-up notification for foreground messages.
  /// Falls back to a [SnackBar] when [_LocalNotif] is not ready.
  Future<void> _showLocalNotif(RemoteMessage message, GoRouter router) async {
    final title = message.notification?.title ?? '';
    final body  = message.notification?.body  ?? '';
    if (title.isEmpty && body.isEmpty) return;

    // Try the native overlay first
    final shown = await _LocalNotif.show(
      id: _notifId++,
      title: title,
      body: body,
    );

    // Fallback: SnackBar (keeps the navigation action for deep-linking)
    if (!shown) {
      _showSnackBar(message, router);
    }
  }

  /// SnackBar fallback — used when local notifications failed to initialise.
  void _showSnackBar(RemoteMessage message, GoRouter router) {
    final title = message.notification?.title ?? '';
    final body  = message.notification?.body  ?? '';
    if (title.isEmpty && body.isEmpty) return;

    scaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (title.isNotEmpty)
              Text(title, style: const TextStyle(
                fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 13)),
            if (body.isNotEmpty)
              Text(body, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12)),
          ],
        ),
        action: message.data['link'] != null
            ? SnackBarAction(
                label: 'عرض',
                onPressed: () => _navigate(message, router),
              )
            : null,
        duration: const Duration(seconds: 5),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // Route to the right screen based on notification data.link or type
  void _navigate(RemoteMessage message, GoRouter router) {
    final link = message.data['link'] as String?;
    if (link != null && link.startsWith('/')) {
      router.push(link);
      return;
    }

    final type = message.data['type'] as String? ?? '';
    switch (type) {
      case 'order_placed':
      case 'order_confirmed':
      case 'order_completed':
      case 'order_cancelled':
        router.push('/buyer/orders');
      case 'listing_pending':
      case 'listing_approved':
      case 'listing_rejected':
        router.push('/seller/listings');
      case 'vaccination_due':
      case 'weighing_due':
      case 'pregnancy_due':
      case 'weight_milestone':
        router.push('/seller/herd');
      case 'dairy_expiry':
        router.push('/seller/dairy');
      case 'medical_followup':
        router.push('/seller/herd');
      default:
        router.push('/buyer/notifications');
    }
  }
}

final fcmServiceProvider = Provider<FcmService>((ref) {
  return FcmService(ref.read(dioProvider));
});
