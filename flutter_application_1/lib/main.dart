import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'firebase_options.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/splash_screen.dart';
import 'services/auth_service.dart';
import 'services/push_notification_service.dart';

const Color appPrimary = Color(0xFFE64A19);
const Color appSecondary = Color(0xFFFFB300);
const Color appBackground = Color(0xFFFFF3E0);

const bool _useFirebaseEmulators = bool.fromEnvironment(
  'USE_FIREBASE_EMULATORS',
);
const String _firebaseEmulatorHost = String.fromEnvironment(
  'FIREBASE_EMULATOR_HOST',
  defaultValue: '127.0.0.1',
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  if (_useFirebaseEmulators) {
    FirebaseFirestore.instance.settings = const Settings(
      persistenceEnabled: false,
    );
    await FirebaseAuth.instance.useAuthEmulator(_firebaseEmulatorHost, 9099);
    FirebaseFirestore.instance.useFirestoreEmulator(
      _firebaseEmulatorHost,
      8080,
    );
    FirebaseStorage.instance.useStorageEmulator(_firebaseEmulatorHost, 9199);
  }

  if (!kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS)) {
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  }
  runApp(const BookShareApp());
  await PushNotificationService.initialize();
}

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
}

class BookShareApp extends StatelessWidget {
  const BookShareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: PushNotificationService.navigatorKey,
      scaffoldMessengerKey: PushNotificationService.scaffoldMessengerKey,
      debugShowCheckedModeBanner: false,
      title: 'BookShare',
      routes: {
        '/notifications': (_) => const NotificationsScreen(),
      },
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: appBackground,
        colorScheme: ColorScheme.fromSeed(
          seedColor: appPrimary,
          primary: appPrimary,
          secondary: appSecondary,
          surface: Colors.white,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: appPrimary,
          foregroundColor: Colors.white,
          centerTitle: true,
          elevation: 0,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: appPrimary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
        cardTheme: const CardThemeData(
          color: Colors.white,
          elevation: 3,
          margin: EdgeInsets.zero,
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    if (Firebase.apps.isEmpty) {
      return const SplashScreen();
    }

    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SplashScreen();
        }

        if (snapshot.data != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (FirebaseAuth.instance.currentUser != null) {
              AuthService.syncCurrentUser();
            }
          });

          return const HomeScreen();
        }

        return const LoginScreen();
      },
    );
  }
}
