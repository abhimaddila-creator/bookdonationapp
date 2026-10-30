import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../models/user.dart';
import 'push_notification_service.dart';

class AuthService {
  static User? currentUser;

  static Future<void> syncCurrentUser() async {
    final firebaseUser = firebase_auth.FirebaseAuth.instance.currentUser;

    if (firebaseUser == null) {
      currentUser = null;
      return;
    }

    String userName = firebaseUser.displayName ?? 'User';

    if (userName == 'User' || userName.trim().isEmpty) {
      try {
        final userDoc = await FirebaseFirestore.instance
            .collection('users')
            .doc(firebaseUser.uid)
            .get();

        final storedName = userDoc.data()?['name']?.toString();
        if (storedName != null && storedName.trim().isNotEmpty) {
          userName = storedName;
        }
      } catch (_) {
        // ignore lookup issues and keep fallback name
      }
    }

    currentUser = User(
      name: userName,
      email: firebaseUser.email ?? '',
    );
  }

  static void updateCurrentUserName(String newName) {
    if (currentUser == null) {
      syncCurrentUser();
    }

    currentUser = User(
      name: newName.trim().isNotEmpty ? newName.trim() : 'User',
      email: currentUser?.email ?? '',
    );
  }

  // REGISTER USER
  static Future<bool> registerUser({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      // Create account in Firebase Authentication
      final credential = await firebase_auth.FirebaseAuth.instance
          .createUserWithEmailAndPassword(
            email: email.trim(),
            password: password,
          );

      final trimmedName = name.trim();
      await credential.user?.updateDisplayName(trimmedName);

      // Save user details in Firestore
      await FirebaseFirestore.instance
          .collection('users')
          .doc(credential.user!.uid)
          .set({
            'name': trimmedName,
            'email': email.trim().toLowerCase(),
            'createdAt': FieldValue.serverTimestamp(),
          });

      await syncCurrentUser();

      // Store current user in our app
      currentUser ??= User(
        name: trimmedName,
        email: email.trim().toLowerCase(),
      );

      return true;
    } on firebase_auth.FirebaseAuthException catch (e) {
      debugPrint('Firebase Register Error: ${e.code}');
      return false;
    } catch (e) {
      debugPrint('Register Error: $e');
      return false;
    }
  }

  // LOGIN USER
  static Future<bool> loginUser({
    required String email,
    required String password,
  }) async {
    try {
      // Login using Firebase Authentication
      final credential = await firebase_auth.FirebaseAuth.instance
          .signInWithEmailAndPassword(email: email.trim(), password: password);

      // Get user details from Firestore
      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(credential.user!.uid)
          .get();

      final data = userDoc.data();

      currentUser = User(
        name: data?['name']?.toString() ?? credential.user?.displayName ?? 'User',
        email: credential.user?.email ?? email.trim(),
      );

      await syncCurrentUser();

      return true;
    } on firebase_auth.FirebaseAuthException catch (e) {
      debugPrint('Firebase Login Error: ${e.code}');
      return false;
    } catch (e) {
      debugPrint('Login Error: $e');
      return false;
    }
  }

  // LOGOUT USER
  static Future<void> logout() async {
    try {
      await PushNotificationService.unregisterCurrentToken();
    } catch (error) {
      debugPrint('Push notification token cleanup failed: $error');
    }
    await firebase_auth.FirebaseAuth.instance.signOut();
    currentUser = null;
  }
}
