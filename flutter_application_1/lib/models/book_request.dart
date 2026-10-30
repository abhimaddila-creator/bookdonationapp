import 'book.dart';

class BookRequest {
  final Book book;
  final String status;
  final DateTime requestDate;

  // Requester information
  final String requesterName;
  final String requesterEmail;

  BookRequest({
    required this.book,
    required this.status,
    required this.requestDate,
    required this.requesterName,
    required this.requesterEmail,
  });
}
