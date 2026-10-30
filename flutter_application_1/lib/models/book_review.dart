import 'package:cloud_firestore/cloud_firestore.dart';

class BookReview {
  final String reviewerId;
  final String reviewerName;
  final int rating;
  final String comment;
  final DateTime? createdAt;

  const BookReview({
    required this.reviewerId,
    required this.reviewerName,
    required this.rating,
    required this.comment,
    this.createdAt,
  });

  factory BookReview.fromFirestore(
    DocumentSnapshot<Map<String, dynamic>> document,
  ) {
    final data = document.data() ?? {};
    final createdAt = data['createdAt'];

    final rating = (data['rating'] as num?)?.toInt() ?? 0;

    return BookReview(
      reviewerId: data['reviewerId']?.toString() ?? document.id,
      reviewerName: data['reviewerName']?.toString() ?? 'Reader',
      rating: rating.clamp(0, 5),
      comment: data['comment']?.toString() ?? '',
      createdAt: createdAt is Timestamp ? createdAt.toDate() : null,
    );
  }
}
