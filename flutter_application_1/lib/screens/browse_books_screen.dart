import 'dart:convert';
import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../models/book.dart';
import '../services/book_service.dart';
import 'book_details_screen.dart';

Uint8List? _decodeBase64Image(dynamic value) {
  if (value == null) return null;

  if (value is String && value.isNotEmpty) {
    try {
      return base64Decode(value);
    } catch (_) {
      return null;
    }
  }

  if (value is List) {
    try {
      return Uint8List.fromList(
        value.map((item) => int.parse(item.toString())).toList(),
      );
    } catch (_) {
      return null;
    }
  }

  return null;
}

class BrowseBooksScreen extends StatefulWidget {
  const BrowseBooksScreen({super.key});

  @override
  State<BrowseBooksScreen> createState() => _BrowseBooksScreenState();
}

class _BrowseBooksScreenState extends State<BrowseBooksScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'All';
  String _selectedCondition = 'All';
  String _sortBy = 'Title A-Z';

  String _normalizedCategory(String value) => value.trim();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Browse Books',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
      ),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: FirebaseFirestore.instance.collection('books').snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          final documents = snapshot.data?.docs ?? [];
          final allBooks =
              (documents.isEmpty
                    ? BookService.books
                    : documents.map((doc) {
                        final data = doc.data();
                        final category = _normalizedCategory(
                          data['category']?.toString() ?? 'General',
                        );
                        return Book(
                          id: doc.id,
                          title: data['title']?.toString() ?? '',
                          author: data['author']?.toString() ?? '',
                          category: category.isEmpty ? 'General' : category,
                          condition: data['condition']?.toString() ?? 'Good',
                          description: data['description']?.toString() ?? '',
                          donorName: data['donorName']?.toString() ?? 'User',
                          donorEmail: data['donorEmail']?.toString() ?? '',
                          imageUrl: data['imageUrl']?.toString(),
                          image: _decodeBase64Image(data['imageBase64']),
                        );
                      }).toList())
                ..sort(
                  (a, b) =>
                      a.title.toLowerCase().compareTo(b.title.toLowerCase()),
                );

          final categories = <String>{'All'};

          for (final book in allBooks) {
            final category = _normalizedCategory(book.category);
            if (category.isNotEmpty) {
              categories.add(category);
            }
          }

          final sortedCategories = categories.toList()
            ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
          final conditions = <String>{'All'};

          for (final book in allBooks) {
            final condition = book.condition.trim();
            if (condition.isNotEmpty) {
              conditions.add(condition);
            }
          }

          final sortedConditions = conditions.toList()
            ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));

          final filteredBooks = allBooks.where((book) {
            final matchesCategory =
                _selectedCategory == 'All' ||
                _normalizedCategory(book.category).toLowerCase() ==
                    _selectedCategory.toLowerCase();
            final matchesCondition =
                _selectedCondition == 'All' ||
                book.condition.trim().toLowerCase() ==
                    _selectedCondition.toLowerCase();

            final query = _searchController.text.trim().toLowerCase();
            final matchesSearch =
                query.isEmpty ||
                book.title.toLowerCase().contains(query) ||
                book.author.toLowerCase().contains(query) ||
                book.category.toLowerCase().contains(query) ||
                book.description.toLowerCase().contains(query);

            return matchesCategory && matchesCondition && matchesSearch;
          }).toList();

          filteredBooks.sort((a, b) {
            switch (_sortBy) {
              case 'Title Z-A':
                return b.title.toLowerCase().compareTo(a.title.toLowerCase());
              case 'Author A-Z':
                return a.author.toLowerCase().compareTo(b.author.toLowerCase());
              default:
                return a.title.toLowerCase().compareTo(b.title.toLowerCase());
            }
          });

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Search by title, author or category',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: Colors.grey.shade100,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: SizedBox(
                  height: 42,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: sortedCategories.map((category) {
                      final isSelected =
                          _selectedCategory.toLowerCase() ==
                          category.toLowerCase();
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(category),
                          selected: isSelected,
                          selectedColor: Colors.green.shade100,
                          backgroundColor: Colors.grey.shade200,
                          onSelected: (_) {
                            setState(() {
                              _selectedCategory = category;
                            });
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue:
                            sortedConditions.contains(_selectedCondition)
                            ? _selectedCondition
                            : 'All',
                        decoration: const InputDecoration(
                          labelText: 'Condition',
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          border: OutlineInputBorder(),
                        ),
                        items: sortedConditions
                            .map(
                              (condition) => DropdownMenuItem(
                                value: condition,
                                child: Text(condition),
                              ),
                            )
                            .toList(),
                        onChanged: (condition) {
                          if (condition != null) {
                            setState(() {
                              _selectedCondition = condition;
                            });
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _sortBy,
                        decoration: const InputDecoration(
                          labelText: 'Sort by',
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: 'Title A-Z',
                            child: Text('Title A-Z'),
                          ),
                          DropdownMenuItem(
                            value: 'Title Z-A',
                            child: Text('Title Z-A'),
                          ),
                          DropdownMenuItem(
                            value: 'Author A-Z',
                            child: Text('Author A-Z'),
                          ),
                        ],
                        onChanged: (sortBy) {
                          if (sortBy != null) {
                            setState(() {
                              _sortBy = sortBy;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              if (documents.isEmpty)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.symmetric(horizontal: 12),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'Showing sample books. Donate a book to add a real listing.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.black87),
                  ),
                ),
              Expanded(
                child: filteredBooks.isEmpty
                    ? const Center(
                        child: Text(
                          'No books match your filters',
                          style: TextStyle(fontSize: 16, color: Colors.grey),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: filteredBooks.length,
                        itemBuilder: (context, index) {
                          final book = filteredBooks[index];

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            elevation: 3,
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(15),
                              leading: book.imageUrl != null
                                  ? ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.network(
                                        book.imageUrl!,
                                        width: 56,
                                        height: 56,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) => const Icon(
                                          Icons.broken_image,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    )
                                  : book.image != null
                                  ? ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.memory(
                                        book.image!,
                                        width: 56,
                                        height: 56,
                                        fit: BoxFit.cover,
                                      ),
                                    )
                                  : const CircleAvatar(
                                      radius: 28,
                                      backgroundColor: Colors.green,
                                      child: Icon(
                                        Icons.menu_book,
                                        color: Colors.white,
                                      ),
                                    ),
                              title: Text(
                                book.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 18,
                                ),
                              ),
                              subtitle: Text(
                                'Author: ${book.author}\n'
                                'Category: ${book.category}\n'
                                'Condition: ${book.condition}'
                                '${book.isSample ? '\nSample book' : ''}',
                              ),
                              trailing: const Icon(
                                Icons.arrow_forward_ios,
                                size: 18,
                              ),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        BookDetailsScreen(book: book),
                                  ),
                                );
                              },
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
