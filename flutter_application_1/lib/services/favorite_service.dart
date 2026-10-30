import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/book.dart';

class FavoriteService {
  static final FirebaseFirestore _db = FirebaseFirestore.instance;

  static CollectionReference<Map<String, dynamic>> _collection(
    String userId,
  ) {
    return _db.collection('users').doc(userId).collection('favorites');
  }

  static String _favoriteId(Book book) {
    if (book.id != null && book.id!.isNotEmpty) return book.id!;

    final key = jsonEncode([
      book.title.trim().toLowerCase(),
      book.author.trim().toLowerCase(),
      book.donorEmail.trim().toLowerCase(),
    ]);
    return base64Url.encode(utf8.encode(key)).replaceAll('=', '');
  }

  static Map<String, dynamic> _bookData(Book book) {
    return {
      'bookId': book.id ?? _favoriteId(book),
      'title': book.title,
      'author': book.author,
      'category': book.category,
      'condition': book.condition,
      'description': book.description,
      'donorName': book.donorName,
      'donorEmail': book.donorEmail,
      'imageUrl': book.imageUrl,
      'isSample': book.isSample,
      'savedAt': FieldValue.serverTimestamp(),
    };
  }

  static Book _bookFromData(
    QueryDocumentSnapshot<Map<String, dynamic>> document,
  ) {
    final data = document.data();
    return Book(
      id: data['bookId']?.toString() ?? document.id,
      title: data['title']?.toString() ?? 'Untitled book',
      author: data['author']?.toString() ?? 'Unknown author',
      category: data['category']?.toString() ?? 'General',
      condition: data['condition']?.toString() ?? 'Good',
      description: data['description']?.toString() ?? '',
      donorName: data['donorName']?.toString() ?? 'User',
      donorEmail: data['donorEmail']?.toString() ?? '',
      imageUrl: data['imageUrl']?.toString(),
      isSample: data['isSample'] == true,
    );
  }

  static Stream<List<Book>> watchFavorites(String userId) {
    return _collection(userId)
        .snapshots()
        .map((snapshot) {
          final favorites = snapshot.docs.map(_bookFromData).toList();
          favorites.sort(
            (a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()),
          );
          return favorites;
        });
  }

  static Future<bool> isFavorite({
    required String userId,
    required Book book,
  }) async {
    final snapshot = await _collection(userId).doc(_favoriteId(book)).get();
    return snapshot.exists;
  }

  static Future<bool> toggleFavorite({
    required String userId,
    required Book book,
  }) async {
    final favoriteRef = _collection(userId).doc(_favoriteId(book));
    return _db.runTransaction((transaction) async {
      final snapshot = await transaction.get(favoriteRef);
      if (snapshot.exists) {
        transaction.delete(favoriteRef);
        return false;
      }

      transaction.set(favoriteRef, _bookData(book));
      return true;
    });
  }

  static Future<int> favoriteCount(String userId) async {
    final snapshot = await _collection(userId).count().get();
    return snapshot.count ?? 0;
  }
}
