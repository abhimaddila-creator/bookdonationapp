import 'dart:typed_data';

import 'package:firebase_storage/firebase_storage.dart';

class StorageService {
  static Future<String?> uploadBookImage({
    required Uint8List imageBytes,
    required String userId,
  }) async {
    try {
      final safeUserId = userId.length >= 8 ? userId.substring(0, 8) : userId;
      final fileName =
          '${DateTime.now().millisecondsSinceEpoch}_$safeUserId.jpg';
      final ref = FirebaseStorage.instance
          .ref()
          .child('book_covers')
          .child(userId)
          .child(fileName);

      final uploadTask = await ref.putData(
        imageBytes,
        SettableMetadata(contentType: 'image/jpeg'),
      );

      return await uploadTask.ref.getDownloadURL();
    } catch (_) {
      return null;
    }
  }
}
