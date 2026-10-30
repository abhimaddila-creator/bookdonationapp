import 'package:cloud_firestore/cloud_firestore.dart';

class ChatService {
  static final FirebaseFirestore _db = FirebaseFirestore.instance;

  static String buildRoomId({required String requestId}) {
    return 'room_$requestId';
  }

  static Future<String> createRoom({
    required String requestId,
    required String bookId,
    required String bookTitle,
    required String donorId,
    required String donorName,
    required String requesterId,
    required String requesterName,
  }) async {
    final roomId = buildRoomId(requestId: requestId);
    final roomRef = _db.collection('chat_rooms').doc(roomId);
    final snapshot = await roomRef.get();

    if (!snapshot.exists) {
      await roomRef.set({
        'requestId': requestId,
        'bookId': bookId,
        'bookTitle': bookTitle,
        'donorId': donorId,
        'donorName': donorName,
        'requesterId': requesterId,
        'requesterName': requesterName,
        'participantIds': [donorId, requesterId],
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
        'lastMessage': '',
        'lastMessageAt': FieldValue.serverTimestamp(),
      });
    } else {
      await roomRef.update({
        'bookTitle': bookTitle,
        'donorName': donorName,
        'requesterName': requesterName,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }

    return roomId;
  }

  static Stream<QuerySnapshot<Map<String, dynamic>>> streamUserRooms(
    String userId,
  ) {
    return _db
        .collection('chat_rooms')
        .where('participantIds', arrayContains: userId)
        .orderBy('updatedAt', descending: true)
        .snapshots();
  }

  static Stream<QuerySnapshot<Map<String, dynamic>>> streamMessages(
    String roomId,
  ) {
    return _db
        .collection('chat_rooms')
        .doc(roomId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots();
  }

  static Future<void> sendMessage({
    required String roomId,
    required String senderId,
    required String senderName,
    required String text,
  }) async {
    final trimmedText = text.trim();
    if (trimmedText.isEmpty) return;

    final roomRef = _db.collection('chat_rooms').doc(roomId);

    await roomRef.collection('messages').add({
      'senderId': senderId,
      'senderName': senderName,
      'text': trimmedText,
      'createdAt': FieldValue.serverTimestamp(),
    });

    await roomRef.update({
      'lastMessage': trimmedText,
      'lastMessageAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  static String getRoomTitle(Map<String, dynamic> roomData) {
    return roomData['bookTitle']?.toString() ?? 'Book chat';
  }

  static String getOtherUserName(
    Map<String, dynamic> roomData,
    String currentUserId,
  ) {
    if (roomData['requesterId'] == currentUserId) {
      return roomData['donorName']?.toString() ?? 'Donor';
    }

    return roomData['requesterName']?.toString() ?? 'Requester';
  }
}
