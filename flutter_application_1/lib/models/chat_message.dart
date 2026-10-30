import 'package:cloud_firestore/cloud_firestore.dart';

class ChatMessage {
  final String id;
  final String senderId;
  final String senderName;
  final String text;
  final DateTime sentAt;

  ChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.text,
    required this.sentAt,
  });

  factory ChatMessage.fromMap(String id, Map<String, dynamic> data) {
    final sentAt = (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now();

    return ChatMessage(
      id: id,
      senderId: data['senderId']?.toString() ?? '',
      senderName: data['senderName']?.toString() ?? 'User',
      text: data['text']?.toString() ?? '',
      sentAt: sentAt,
    );
  }
}
