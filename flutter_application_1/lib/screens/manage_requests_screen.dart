import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import 'chat_screen.dart';

class ManageRequestsScreen extends StatefulWidget {
  const ManageRequestsScreen({super.key});

  @override
  State<ManageRequestsScreen> createState() => _ManageRequestsScreenState();
}

class _ManageRequestsScreenState extends State<ManageRequestsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedStatus = 'All';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _confirmRequestStatus(
    BuildContext context,
    String requestId,
    String status,
    String bookTitle,
  ) async {
    final isApproval = status == 'Approved';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(isApproval ? 'Approve request?' : 'Reject request?'),
        content: Text(
          isApproval
              ? 'Approve the request for "$bookTitle"? The requester will be notified.'
              : 'Reject the request for "$bookTitle"? This decision cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: isApproval
                ? null
                : FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(isApproval ? 'Approve' : 'Reject'),
          ),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;
    await updateRequestStatus(context, requestId, status);
  }

  Future<void> updateRequestStatus(
    BuildContext context,
    String requestId,
    String status,
  ) async {
    try {
      await FirebaseFirestore.instance
          .collection('book_requests')
          .doc(requestId)
          .update({
            'status': status,
            'updatedAt': FieldValue.serverTimestamp(),
          });

      if (!context.mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            status == 'Approved'
                ? 'Request approved successfully.'
                : 'Request rejected successfully.',
          ),
          backgroundColor: status == 'Approved' ? Colors.green : Colors.red,
        ),
      );
    } catch (e) {
      if (!context.mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update request: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final firebaseUser = FirebaseAuth.instance.currentUser;

    if (firebaseUser == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Manage Requests'),
          backgroundColor: Colors.green,
          foregroundColor: Colors.white,
        ),
        body: const Center(
          child: Text('Please login first.', style: TextStyle(fontSize: 18)),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Manage Requests',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: FirebaseFirestore.instance
            .collection('book_requests')
            .where('donorId', isEqualTo: firebaseUser.uid)
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  'Error loading requests:\n${snapshot.error}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
            );
          }

          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final documents = snapshot.data?.docs ?? [];

          if (documents.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.inbox_outlined, size: 80, color: Colors.grey),
                    SizedBox(height: 20),
                    Text(
                      'No Requests Yet',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Requests for your donated books will appear here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, fontSize: 15),
                    ),
                  ],
                ),
              ),
            );
          }

          final sortedDocuments = [...documents]
            ..sort((a, b) {
              final aCreatedAt = a.data()['createdAt'];
              final bCreatedAt = b.data()['createdAt'];
              final aDate = aCreatedAt is Timestamp
                  ? aCreatedAt.toDate()
                  : DateTime.fromMillisecondsSinceEpoch(0);
              final bDate = bCreatedAt is Timestamp
                  ? bCreatedAt.toDate()
                  : DateTime.fromMillisecondsSinceEpoch(0);
              return bDate.compareTo(aDate);
            });
          final pendingCount = sortedDocuments
              .where(
                (document) =>
                    _normalizeStatus(document.data()['status']?.toString()) ==
                    'Pending',
              )
              .length;
          final approvedCount = sortedDocuments
              .where(
                (document) =>
                    _normalizeStatus(document.data()['status']?.toString()) ==
                    'Approved',
              )
              .length;
          final rejectedCount = sortedDocuments
              .where(
                (document) =>
                    _normalizeStatus(document.data()['status']?.toString()) ==
                    'Rejected',
              )
              .length;
          final query = _searchController.text.trim().toLowerCase();
          final filteredDocuments = sortedDocuments.where((document) {
            final data = document.data();
            final status = _normalizeStatus(data['status']?.toString());
            final matchesStatus =
                _selectedStatus == 'All' || status == _selectedStatus;
            final matchesSearch =
                query.isEmpty ||
                (data['bookTitle']?.toString() ?? '').toLowerCase().contains(
                  query,
                ) ||
                (data['bookAuthor']?.toString() ?? '').toLowerCase().contains(
                  query,
                ) ||
                (data['requesterName']?.toString() ?? '')
                    .toLowerCase()
                    .contains(query) ||
                (data['requesterEmail']?.toString() ?? '')
                    .toLowerCase()
                    .contains(query);
            return matchesStatus && matchesSearch;
          }).toList();

          final statusCounts = {
            'All': sortedDocuments.length,
            'Pending': pendingCount,
            'Approved': approvedCount,
            'Rejected': rejectedCount,
          };

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Search book or requester',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Clear search',
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                            icon: const Icon(Icons.clear),
                          ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                ),
              ),
              SizedBox(
                height: 48,
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  scrollDirection: Axis.horizontal,
                  children: statusCounts.entries.map((entry) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text('${entry.key} (${entry.value})'),
                        selected: _selectedStatus == entry.key,
                        onSelected: (_) {
                          setState(() {
                            _selectedStatus = entry.key;
                          });
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
              Expanded(
                child: filteredDocuments.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(
                            query.isEmpty
                                ? 'No ${_selectedStatus.toLowerCase()} requests.'
                                : 'No requests match your search.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.grey,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredDocuments.length,
                        itemBuilder: (context, index) {
                          final doc = filteredDocuments[index];
                          final data = doc.data();

                          final bookTitle =
                              data['bookTitle']?.toString() ?? 'Unknown Book';

                          final bookAuthor =
                              data['bookAuthor']?.toString() ??
                              'Unknown Author';

                          final requesterName =
                              data['requesterName']?.toString() ??
                              'Unknown User';

                          final requesterEmail =
                              data['requesterEmail']?.toString() ?? '';

                          final status = _normalizeStatus(
                            data['status']?.toString(),
                          );

                          final createdAt = data['createdAt'];

                          String requestDate = '';

                          if (createdAt is Timestamp) {
                            requestDate = _formatDate(createdAt.toDate());
                          }

                          Color statusColor;

                          if (status == 'Approved') {
                            statusColor = Colors.green;
                          } else if (status == 'Rejected') {
                            statusColor = Colors.red;
                          } else {
                            statusColor = Colors.orange;
                          }

                          return Card(
                            elevation: 3,
                            margin: const EdgeInsets.only(bottom: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(15),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        width: 55,
                                        height: 65,
                                        decoration: BoxDecoration(
                                          color: Colors.green.shade50,
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.menu_book,
                                          size: 35,
                                          color: Colors.green,
                                        ),
                                      ),
                                      const SizedBox(width: 15),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              bookTitle,
                                              style: const TextStyle(
                                                fontSize: 19,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 5),
                                            Text(
                                              'Author: $bookAuthor',
                                              style: const TextStyle(
                                                color: Colors.grey,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),

                                  const SizedBox(height: 18),

                                  const Divider(),

                                  const SizedBox(height: 10),

                                  const Text(
                                    'Requester Information',
                                    style: TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),

                                  const SizedBox(height: 10),

                                  Row(
                                    children: [
                                      const CircleAvatar(
                                        backgroundColor: Color(0xFFE8F5E9),
                                        child: Icon(
                                          Icons.person,
                                          color: Colors.green,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              requesterName,
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            if (requesterEmail.isNotEmpty)
                                              Text(
                                                requesterEmail,
                                                style: const TextStyle(
                                                  color: Colors.grey,
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),

                                  const SizedBox(height: 15),

                                  Row(
                                    children: [
                                      const Text(
                                        'Status: ',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: statusColor.withValues(
                                            alpha: 0.12,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            20,
                                          ),
                                        ),
                                        child: Text(
                                          status,
                                          style: TextStyle(
                                            color: statusColor,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),

                                  if (requestDate.isNotEmpty) ...[
                                    const SizedBox(height: 10),
                                    Text(
                                      'Requested on: $requestDate',
                                      style: const TextStyle(
                                        color: Colors.grey,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],

                                  const SizedBox(height: 15),

                                  if ((data['chatRoomId'] ?? '')
                                      .toString()
                                      .isNotEmpty) ...[
                                    const SizedBox(height: 12),
                                    SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton.icon(
                                        onPressed: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (context) => ChatScreen(
                                                roomId: data['chatRoomId']
                                                    .toString(),
                                                bookTitle: bookTitle,
                                                otherUserName: requesterName,
                                              ),
                                            ),
                                          );
                                        },
                                        icon: const Icon(
                                          Icons.chat_bubble_outline,
                                        ),
                                        label: const Text('Open Chat'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.green,
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 12,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],

                                  if (status == 'Pending')
                                    Row(
                                      children: [
                                        Expanded(
                                          child: ElevatedButton.icon(
                                            onPressed: () {
                                              _confirmRequestStatus(
                                                context,
                                                doc.id,
                                                'Approved',
                                                bookTitle,
                                              );
                                            },
                                            icon: const Icon(Icons.check),
                                            label: const Text('Approve'),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.green,
                                              foregroundColor: Colors.white,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 13,
                                                  ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(10),
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: ElevatedButton.icon(
                                            onPressed: () {
                                              _confirmRequestStatus(
                                                context,
                                                doc.id,
                                                'Rejected',
                                                bookTitle,
                                              );
                                            },
                                            icon: const Icon(Icons.close),
                                            label: const Text('Reject'),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.red,
                                              foregroundColor: Colors.white,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 13,
                                                  ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(10),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                ],
                              ),
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

  static String _normalizeStatus(String? value) {
    final status = value?.trim() ?? 'Pending';

    switch (status.toLowerCase()) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  }

  static String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }
}
