import 'package:cloud_firestore/cloud_firestore.dart';

class AppNotification {
  final String id;
  final String title;
  final String message;
  final DateTime date;
  final String userEmail;
  final bool isRead;
  final String type;
  final String? requestId;
  final String? chatRoomId;
  final String? status;

  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.date,
    required this.userEmail,
    required this.isRead,
    required this.type,
    this.requestId,
    this.chatRoomId,
    this.status,
  });

  factory AppNotification.fromFirestore(
    QueryDocumentSnapshot<Map<String, dynamic>> document,
  ) {
    final data = document.data();
    final timestamp = data['date'];
    return AppNotification(
      id: document.id,
      title: data['title']?.toString() ?? 'Notification',
      message: data['message']?.toString() ?? '',
      date: timestamp is Timestamp ? timestamp.toDate() : DateTime.now(),
      userEmail: data['userEmail']?.toString() ?? '',
      isRead: data['isRead'] == true,
      type: data['type']?.toString() ?? 'request_decision',
      requestId: data['requestId']?.toString(),
      chatRoomId: data['chatRoomId']?.toString(),
      status: data['status']?.toString(),
    );
  }
}
