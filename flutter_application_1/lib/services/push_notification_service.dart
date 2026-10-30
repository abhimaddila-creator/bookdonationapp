import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class PushNotificationService {
  PushNotificationService._();

  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FirebaseFirestore _db = FirebaseFirestore.instance;
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();
  static final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();

  static StreamSubscription<User?>? _authSubscription;
  static StreamSubscription<String>? _tokenSubscription;
  static StreamSubscription<RemoteMessage>? _messageSubscription;
  static StreamSubscription<RemoteMessage>? _openedSubscription;
  static final Set<String> _registeringUsers = {};
  static String? _registeredUserId;
  static String? _registeredToken;

  static bool get _supportsPush =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  static Future<void> initialize() async {
    if (!_supportsPush) return;

    _messageSubscription = FirebaseMessaging.onMessage.listen((message) {
      final title = message.notification?.title ?? 'BookShare';
      final body = message.notification?.body ?? 'You have a new update.';
      scaffoldMessengerKey.currentState
        ?..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text('$title: $body')));
    });

    _openedSubscription = FirebaseMessaging.onMessageOpenedApp.listen((_) {
      navigatorKey.currentState?.pushNamed('/notifications');
    });

    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        navigatorKey.currentState?.pushNamed('/notifications');
      });
    }

    _authSubscription = FirebaseAuth.instance.authStateChanges().listen((user) {
      if (user != null) {
        unawaited(_registerToken(user));
      }
    });

    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      await _registerToken(user);
    }
  }

  static Future<void> _registerToken(User user) async {
    if ((_registeredUserId == user.uid && _registeredToken != null) ||
        !_registeringUsers.add(user.uid)) {
      return;
    }

    try {
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;

      final token = await _messaging.getToken();
      if (token == null || token.isEmpty) return;

      await _storeToken(user.uid, token);

      _tokenSubscription ??= _messaging.onTokenRefresh.listen((newToken) {
        final currentUser = FirebaseAuth.instance.currentUser;
        if (currentUser == null) return;
        unawaited(_storeToken(currentUser.uid, newToken));
      });
    } catch (error) {
      debugPrint('Push notification registration failed: $error');
    } finally {
      _registeringUsers.remove(user.uid);
    }
  }

  static Future<void> _storeToken(String userId, String token) async {
    final oldToken = _registeredUserId == userId ? _registeredToken : null;
    final userRef = _db.collection('users').doc(userId);
    await userRef.set({
      'fcmTokens': FieldValue.arrayUnion([token]),
    }, SetOptions(merge: true));
    if (oldToken != null && oldToken != token) {
      await userRef.update({
        'fcmTokens': FieldValue.arrayRemove([oldToken]),
      });
    }
    _registeredUserId = userId;
    _registeredToken = token;
  }

  static Future<void> unregisterCurrentToken() async {
    if (!_supportsPush) return;

    final token = _registeredToken ?? await _messaging.getToken();
    final userId = _registeredUserId ?? FirebaseAuth.instance.currentUser?.uid;

    if (token != null && userId != null) {
      await _db.collection('users').doc(userId).update({
        'fcmTokens': FieldValue.arrayRemove([token]),
      });
    }

    _registeredUserId = null;
    _registeredToken = null;
  }

  static Future<void> dispose() async {
    await _authSubscription?.cancel();
    await _tokenSubscription?.cancel();
    await _messageSubscription?.cancel();
    await _openedSubscription?.cancel();
  }
}
