import 'dart:typed_data';

class Book {
  final String? id;
  final String title;
  final String author;
  final String category;
  final String condition;
  final String description;
  final Uint8List? image;
  final String? imageUrl;

  // Donor information
  final String donorName;
  final String donorEmail;
  final bool isSample;

  Book({
    this.id,
    required this.title,
    required this.author,
    required this.category,
    required this.condition,
    required this.description,
    this.image,
    this.imageUrl,
    required this.donorName,
    required this.donorEmail,
    this.isSample = false,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is Book &&
        other.title == title &&
        other.author == author &&
        other.donorEmail == donorEmail;
  }

  @override
  int get hashCode => Object.hash(title, author, donorEmail);
}
