import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/notification.dart';

class NotificationService {
  static final FirebaseFirestore _db = FirebaseFirestore.instance;

  static Query<Map<String, dynamic>> _userNotifications(String userId) {
    return _db.collection('notifications').where('userId', isEqualTo: userId);
  }

  static Stream<List<AppNotification>> watchNotifications(String userId) {
    return _userNotifications(userId).snapshots().map((snapshot) {
      final notifications = snapshot.docs
          .map(AppNotification.fromFirestore)
          .toList();
      notifications.sort((a, b) => b.date.compareTo(a.date));
      return notifications;
    });
  }

  static Stream<int> watchUnreadCount(String userId) {
    return _userNotifications(userId).snapshots().map(
      (snapshot) => snapshot.docs
          .where((document) => document.data()['isRead'] != true)
          .length,
    );
  }

  static Future<void> markAsRead({
    required String notificationId,
  }) async {
    await _db
        .collection('notifications')
        .doc(notificationId)
        .update({'isRead': true});
  }

  static Future<void> markAllAsRead(String userId) async {
    final snapshot = await _userNotifications(userId).get();
    final unreadDocuments = snapshot.docs
        .where((document) => document.data()['isRead'] != true)
        .toList();

    for (var start = 0; start < unreadDocuments.length; start += 450) {
      final batch = _db.batch();
      final chunk = unreadDocuments.skip(start).take(450);
      for (final document in chunk) {
        batch.update(document.reference, {'isRead': true});
      }
      await batch.commit();
    }
  }
}
