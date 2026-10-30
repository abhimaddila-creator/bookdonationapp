import 'package:cloud_firestore/cloud_firestore.dart';

class RequestService {
  static final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Add a book request
  static Future<void> addRequest({
    required String bookId,
    required String bookTitle,
    required String bookAuthor,
    required String bookCategory,
    required String bookCondition,
    required String bookDescription,
    required String donorId,
    required String donorName,
    required String donorEmail,
    required String requesterId,
    required String requesterName,
    required String requesterEmail,
  }) async {
    await _db.collection('book_requests').add({
      'bookId': bookId,
      'bookTitle': bookTitle,
      'bookAuthor': bookAuthor,
      'bookCategory': bookCategory,
      'bookCondition': bookCondition,
      'bookDescription': bookDescription,

      'donorId': donorId,
      'donorName': donorName,
      'donorEmail': donorEmail,

      'requesterId': requesterId,
      'requesterName': requesterName,
      'requesterEmail': requesterEmail,

      'status': 'Pending',
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  // Get requests for the logged-in donor
  static Stream<QuerySnapshot<Map<String, dynamic>>> getDonorRequests(
    String donorId,
  ) {
    return _db
        .collection('book_requests')
        .where('donorId', isEqualTo: donorId)
        .snapshots();
  }

  // Get requests made by the logged-in user
  static Stream<QuerySnapshot<Map<String, dynamic>>> getMyRequests(
    String requesterId,
  ) {
    return _db
        .collection('book_requests')
        .where('requesterId', isEqualTo: requesterId)
        .snapshots();
  }

  // Accept or reject request
  static Future<void> updateStatus(String requestId, String status) async {
    await _db.collection('book_requests').doc(requestId).update({
      'status': status,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Cancel a pending request by the requester
  static Future<void> cancelRequest(String requestId) async {
    await _db.collection('book_requests').doc(requestId).delete();
  }
}
