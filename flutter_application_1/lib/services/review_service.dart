import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/book_review.dart';

class ReviewService {
  static final FirebaseFirestore _db = FirebaseFirestore.instance;

  static CollectionReference<Map<String, dynamic>> _reviews(String bookId) {
    return _db.collection('book_reviews').doc(bookId).collection('reviews');
  }

  static Stream<List<BookReview>> watchReviews(String bookId) {
    return _reviews(bookId).snapshots().map((snapshot) {
      final reviews = snapshot.docs.map(BookReview.fromFirestore).toList();
      reviews.sort((a, b) {
        return (b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0))
            .compareTo(a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0));
      });
      return reviews;
    });
  }

  static Future<String?> approvedRequestId({
    required String bookId,
    required String requesterId,
  }) async {
    final requests = await _db
        .collection('book_requests')
        .where('requesterId', isEqualTo: requesterId)
        .get();

    for (final request in requests.docs) {
      final data = request.data();
      if (data['bookId'] == bookId && data['status'] == 'Approved') {
        return request.id;
      }
    }

    return null;
  }

  static Future<void> saveReview({
    required String bookId,
    required String requestId,
    required String reviewerId,
    required String reviewerEmail,
    required String reviewerName,
    required int rating,
    required String comment,
  }) async {
    final reviewRef = _reviews(bookId).doc(reviewerId);

    await _db.runTransaction((transaction) async {
      final existingReview = await transaction.get(reviewRef);
      final updatedFields = {
        'rating': rating,
        'comment': comment,
        'updatedAt': FieldValue.serverTimestamp(),
      };

      if (existingReview.exists) {
        transaction.update(reviewRef, updatedFields);
      } else {
        transaction.set(reviewRef, {
          ...updatedFields,
          'bookId': bookId,
          'requestId': requestId,
          'reviewerId': reviewerId,
          'reviewerEmail': reviewerEmail,
          'reviewerName': reviewerName,
          'createdAt': FieldValue.serverTimestamp(),
        });
      }
    });
  }
}
