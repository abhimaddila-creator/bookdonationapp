import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../services/storage_service.dart';

class DonateBookScreen extends StatefulWidget {
  const DonateBookScreen({super.key});

  @override
  State<DonateBookScreen> createState() => _DonateBookScreenState();
}

class _DonateBookScreenState extends State<DonateBookScreen> {
  final titleController = TextEditingController();
  final authorController = TextEditingController();
  final descriptionController = TextEditingController();

  final List<String> _categories = [
    'Fiction',
    'Non-Fiction',
    'Science',
    'Technology',
    'History',
    'Biography',
    'Fantasy',
    'Education',
    'Self Help',
    'General',
  ];

  final List<String> _conditions = [
    'Excellent',
    'Very Good',
    'Good',
    'Fair',
  ];

  String selectedCategory = 'General';
  String selectedCondition = 'Good';
  Uint8List? _selectedImage;
  bool loading = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );

    if (pickedFile == null) return;

    final bytes = await pickedFile.readAsBytes();

    setState(() {
      _selectedImage = bytes;
    });
  }

  Future<void> donateBook() async {
    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please login before you donate a book'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (titleController.text.trim().isEmpty ||
        authorController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter book title and author')),
      );
      return;
    }

    setState(() {
      loading = true;
    });

    try {
      final bookData = {
        'title': titleController.text.trim(),
        'author': authorController.text.trim(),
        'category': selectedCategory,
        'condition': selectedCondition,
        'description': descriptionController.text.trim(),
        'donorId': user.uid,
        'donorName': user.displayName ?? 'User',
        'donorEmail': user.email ?? '',
        'createdAt': FieldValue.serverTimestamp(),
      };

      if (_selectedImage != null) {
        final imageUrl = await StorageService.uploadBookImage(
          imageBytes: _selectedImage!,
          userId: user.uid,
        );

        if (imageUrl == null) {
          throw Exception('Image upload failed. Please try again.');
        }

        bookData['imageUrl'] = imageUrl;
      }

      await FirebaseFirestore.instance.collection('books').add(bookData);

      if (!mounted) return;

      setState(() {
        loading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Book donated successfully!'),
          backgroundColor: Colors.green,
        ),
      );

      titleController.clear();
      authorController.clear();
      descriptionController.clear();
      setState(() {
        selectedCategory = 'General';
        selectedCondition = 'Good';
        _selectedImage = null;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        loading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  void dispose() {
    titleController.dispose();
    authorController.dispose();
    descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Donate Book'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            TextField(
              controller: titleController,
              decoration: const InputDecoration(
                labelText: 'Book Title',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 15),

            TextField(
              controller: authorController,
              decoration: const InputDecoration(
                labelText: 'Author',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 15),

            DropdownButtonFormField<String>(
              initialValue: selectedCategory,
              decoration: const InputDecoration(
                labelText: 'Category',
                border: OutlineInputBorder(),
              ),
              items: _categories
                  .map(
                    (category) => DropdownMenuItem(
                      value: category,
                      child: Text(category),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    selectedCategory = value;
                  });
                }
              },
            ),

            const SizedBox(height: 15),

            DropdownButtonFormField<String>(
              initialValue: selectedCondition,
              decoration: const InputDecoration(
                labelText: 'Condition',
                border: OutlineInputBorder(),
              ),
              items: _conditions
                  .map(
                    (condition) => DropdownMenuItem(
                      value: condition,
                      child: Text(condition),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    selectedCondition = value;
                  });
                }
              },
            ),

            const SizedBox(height: 15),

            GestureDetector(
              onTap: _pickImage,
              child: Container(
                width: double.infinity,
                height: 160,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade400),
                  borderRadius: BorderRadius.circular(12),
                  color: Colors.grey.shade50,
                ),
                child: _selectedImage == null
                    ? const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_photo_alternate, size: 40, color: Colors.green),
                          SizedBox(height: 8),
                          Text('Add book cover image'),
                        ],
                      )
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.memory(
                          _selectedImage!,
                          fit: BoxFit.cover,
                          width: double.infinity,
                          height: double.infinity,
                        ),
                      ),
              ),
            ),

            const SizedBox(height: 15),

            TextField(
              controller: descriptionController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 25),

            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: loading ? null : donateBook,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                ),
                child: loading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        'DONATE BOOK',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
