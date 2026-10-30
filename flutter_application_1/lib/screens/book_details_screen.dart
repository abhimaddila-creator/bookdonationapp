import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../models/book.dart';
import '../models/book_review.dart';
import '../services/chat_service.dart';
import '../services/favorite_service.dart';
import '../services/review_service.dart';

class BookDetailsScreen extends StatefulWidget {
  final Book book;

  const BookDetailsScreen({super.key, required this.book});

  @override
  State<BookDetailsScreen> createState() => _BookDetailsScreenState();
}

class _BookDetailsScreenState extends State<BookDetailsScreen> {
  bool isLoading = false;
  bool isRequested = false;
  bool isFavorite = false;
  bool _isFavoriteLoading = true;
  bool _isFavoriteUpdating = false;
  Stream<List<BookReview>>? _reviewsStream;
  Future<String?>? _approvedRequestId;

  @override
  void initState() {
    super.initState();
    _syncFavoriteState();
    final bookId = widget.book.id;
    final user = FirebaseAuth.instance.currentUser;
    if (bookId != null && !widget.book.isSample) {
      _reviewsStream = ReviewService.watchReviews(bookId);
      if (user != null) {
        _approvedRequestId = ReviewService.approvedRequestId(
          bookId: bookId,
          requesterId: user.uid,
        );
      }
    }
  }

  Future<void> _openReviewDialog({
    required String requestId,
    BookReview? existingReview,
  }) async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => _ReviewDialog(
        bookId: widget.book.id!,
        requestId: requestId,
        existingReview: existingReview,
      ),
    );

    if (saved == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Your review has been saved.'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Widget _buildReviewsSection() {
    final bookId = widget.book.id;
    if (bookId == null || widget.book.isSample) {
      return const SizedBox.shrink();
    }

    final user = FirebaseAuth.instance.currentUser;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Ratings & Reviews',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        StreamBuilder<List<BookReview>>(
          stream: _reviewsStream,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Text('Could not load reviews: ${snapshot.error}');
            }
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            final reviews = snapshot.data ?? [];
            final averageRating = reviews.isEmpty
                ? 0.0
                : reviews.fold<int>(
                        0,
                        (total, review) => total + review.rating,
                      ) /
                      reviews.length;
            final ownReview = user == null
                ? null
                : reviews
                      .where((review) => review.reviewerId == user.uid)
                      .firstOrNull;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.star, color: Colors.amber),
                    const SizedBox(width: 4),
                    Text(
                      reviews.isEmpty
                          ? 'No ratings yet'
                          : '${averageRating.toStringAsFixed(1)} / 5 (${reviews.length})',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (user != null && _approvedRequestId != null)
                  FutureBuilder<String?>(
                    future: _approvedRequestId,
                    builder: (context, requestSnapshot) {
                      if (requestSnapshot.hasError) {
                        return Text(
                          'Could not check review eligibility: ${requestSnapshot.error}',
                        );
                      }
                      if (requestSnapshot.connectionState ==
                          ConnectionState.waiting) {
                        return const LinearProgressIndicator();
                      }

                      final requestId = requestSnapshot.data;
                      if (requestId == null) {
                        return const Text(
                          'You can review this book after your request is approved.',
                          style: TextStyle(color: Colors.grey),
                        );
                      }

                      return Align(
                        alignment: Alignment.centerLeft,
                        child: OutlinedButton.icon(
                          onPressed: () => _openReviewDialog(
                            requestId: requestId,
                            existingReview: ownReview,
                          ),
                          icon: const Icon(Icons.rate_review_outlined),
                          label: Text(
                            ownReview == null
                                ? 'Write a review'
                                : 'Edit review',
                          ),
                        ),
                      );
                    },
                  ),
                if (reviews.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      'Be the first to share your experience.',
                      style: TextStyle(color: Colors.grey),
                    ),
                  )
                else
                  ...reviews.map((review) {
                    return Card(
                      margin: const EdgeInsets.only(top: 8),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    review.reviewerName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Text(
                                  List.filled(review.rating, '★').join() +
                                      List.filled(
                                        5 - review.rating,
                                        '☆',
                                      ).join(),
                                  style: const TextStyle(
                                    color: Colors.amber,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                            if (review.createdAt != null)
                              Text(
                                review.createdAt!
                                    .toLocal()
                                    .toString()
                                    .split(' ')
                                    .first,
                                style: const TextStyle(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                            if (review.comment.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(review.comment),
                            ],
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _syncFavoriteState() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      if (mounted) {
        setState(() {
          isFavorite = false;
          _isFavoriteLoading = false;
        });
      }
      return;
    }

    try {
      final saved = await FavoriteService.isFavorite(
        userId: user.uid,
        book: widget.book,
      );
      if (!mounted) return;
      setState(() {
        isFavorite = saved;
        _isFavoriteLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _isFavoriteLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not check saved status: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _toggleFavorite() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please login to save favorites.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isFavoriteUpdating = true);
    try {
      final saved = await FavoriteService.toggleFavorite(
        userId: user.uid,
        book: widget.book,
      );
      if (!mounted) return;
      setState(() {
        isFavorite = saved;
        _isFavoriteUpdating = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(saved ? 'Added to favorites.' : 'Removed from favorites.'),
          backgroundColor: saved ? Colors.green : Colors.orange,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _isFavoriteUpdating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not update favorite: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> requestBook() async {
    if (widget.book.isSample) return;

    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please login first.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      isLoading = true;
    });

    try {
      // Find the donated book in Firebase
      final bookSnapshot = await FirebaseFirestore.instance
          .collection('books')
          .where('title', isEqualTo: widget.book.title)
          .where('donorEmail', isEqualTo: widget.book.donorEmail)
          .limit(1)
          .get();

      if (bookSnapshot.docs.isEmpty) {
        throw Exception('Book not found in Firebase.');
      }

      final bookDoc = bookSnapshot.docs.first;
      final bookData = bookDoc.data();

      final donorId = bookData['donorId']?.toString() ?? '';

      if (donorId.isEmpty) {
        throw Exception('Donor information not found.');
      }

      // Don't allow requesting your own book
      if (donorId == user.uid) {
        if (!mounted) return;

        setState(() {
          isLoading = false;
        });

        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('You cannot request your own book.')),
        );

        return;
      }

      // Check if already requested
      final oldRequest = await FirebaseFirestore.instance
          .collection('book_requests')
          .where('requesterId', isEqualTo: user.uid)
          .where('bookTitle', isEqualTo: widget.book.title)
          .get();

      if (oldRequest.docs.isNotEmpty) {
        if (!mounted) return;

        setState(() {
          isRequested = true;
          isLoading = false;
        });

        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('You have already requested this book.'),
          ),
        );

        return;
      }

      // Create request
      final requestDoc = await FirebaseFirestore.instance
          .collection('book_requests')
          .add({
            'bookId': bookDoc.id,

            'bookTitle': widget.book.title,
            'bookAuthor': widget.book.author,
            'bookCategory': widget.book.category,
            'bookCondition': widget.book.condition,
            'bookDescription': widget.book.description,

            'donorId': donorId,
            'donorName': widget.book.donorName,
            'donorEmail': widget.book.donorEmail,

            'requesterId': user.uid,
            'requesterName': user.displayName ?? 'User',
            'requesterEmail': user.email ?? '',

            'status': 'Pending',
            'createdAt': FieldValue.serverTimestamp(),
          });

      final chatRoomId = await ChatService.createRoom(
        requestId: requestDoc.id,
        bookId: bookDoc.id,
        bookTitle: widget.book.title,
        donorId: donorId,
        donorName: widget.book.donorName,
        requesterId: user.uid,
        requesterName: user.displayName ?? 'User',
      );

      await FirebaseFirestore.instance
          .collection('book_requests')
          .doc(requestDoc.id)
          .update({'chatRoomId': chatRoomId});

      if (!mounted) return;

      setState(() {
        isRequested = true;
        isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Book request sent successfully!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;

      setState(() {
        isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Request failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final book = widget.book;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Book Details',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Book image
            Center(
              child: book.imageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        book.imageUrl!,
                        width: 180,
                        height: 220,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(
                          width: 180,
                          height: 220,
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.menu_book,
                            size: 90,
                            color: Colors.green,
                          ),
                        ),
                      ),
                    )
                  : book.image != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.memory(
                        book.image!,
                        width: 180,
                        height: 220,
                        fit: BoxFit.cover,
                      ),
                    )
                  : Container(
                      width: 180,
                      height: 220,
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.menu_book,
                        size: 90,
                        color: Colors.green,
                      ),
                    ),
            ),

            const SizedBox(height: 25),

            Text(
              book.title,
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
            ),

            const SizedBox(height: 12),

            Text(
              'Author: ${book.author}',
              style: const TextStyle(fontSize: 18),
            ),

            const SizedBox(height: 8),

            Text(
              'Category: ${book.category}',
              style: const TextStyle(fontSize: 18),
            ),

            const SizedBox(height: 8),

            Text(
              'Condition: ${book.condition}',
              style: const TextStyle(fontSize: 18),
            ),

            const SizedBox(height: 15),

            Text(
              'Description:',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),

            const SizedBox(height: 5),

            Text(book.description, style: const TextStyle(fontSize: 16)),

            const SizedBox(height: 15),

            Text(
              'Donated by: ${book.donorName}',
              style: const TextStyle(fontSize: 16, color: Colors.grey),
            ),

            const SizedBox(height: 24),

            _buildReviewsSection(),

            const SizedBox(height: 30),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isFavoriteLoading || _isFavoriteUpdating
                        ? null
                        : _toggleFavorite,
                    icon: Icon(
                      _isFavoriteUpdating
                          ? Icons.hourglass_top
                          : isFavorite
                          ? Icons.favorite
                          : Icons.favorite_border,
                      color: isFavorite ? Colors.red : Colors.grey,
                    ),
                    label: Text(
                      _isFavoriteLoading
                          ? 'Loading...'
                          : isFavorite
                          ? 'Saved'
                          : 'Save Book',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isFavorite ? Colors.red : Colors.green,
                      side: BorderSide(
                        color: isFavorite ? Colors.red : Colors.green,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Request button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: widget.book.isSample || isLoading || isRequested
                    ? null
                    : requestBook,
                icon: Icon(
                  widget.book.isSample
                      ? Icons.info_outline
                      : isRequested
                      ? Icons.check
                      : Icons.send,
                ),
                label: Text(
                  widget.book.isSample
                      ? 'Sample Book'
                      : isRequested
                      ? 'Request Sent'
                      : 'Request Book',
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReviewDialog extends StatefulWidget {
  final String bookId;
  final String requestId;
  final BookReview? existingReview;

  const _ReviewDialog({
    required this.bookId,
    required this.requestId,
    this.existingReview,
  });

  @override
  State<_ReviewDialog> createState() => _ReviewDialogState();
}

class _ReviewDialogState extends State<_ReviewDialog> {
  late final TextEditingController _commentController;
  late int _rating;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _rating = widget.existingReview?.rating ?? 0;
    _commentController = TextEditingController(
      text: widget.existingReview?.comment ?? '',
    );
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null || _rating == 0) return;

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      await ReviewService.saveReview(
        bookId: widget.bookId,
        requestId: widget.requestId,
        reviewerId: user.uid,
        reviewerEmail: user.email ?? '',
        reviewerName: user.displayName ?? 'Reader',
        rating: _rating,
        comment: _commentController.text.trim(),
      );
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _errorMessage = 'Could not save your review: $error';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        widget.existingReview == null ? 'Write a review' : 'Edit review',
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Your rating'),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final value = index + 1;
                return IconButton(
                  tooltip: '$value stars',
                  onPressed: _isSaving
                      ? null
                      : () => setState(() => _rating = value),
                  icon: Icon(
                    value <= _rating ? Icons.star : Icons.star_border,
                    color: Colors.amber,
                  ),
                );
              }),
            ),
            TextField(
              controller: _commentController,
              enabled: !_isSaving,
              maxLength: 1000,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Comment (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            if (_errorMessage != null)
              Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSaving ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _isSaving || _rating == 0 ? null : _save,
          child: _isSaving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Save'),
        ),
      ],
    );
  }
}
