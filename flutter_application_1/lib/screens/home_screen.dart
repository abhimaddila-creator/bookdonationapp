import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import 'browse_books_screen.dart';
import 'donate_book_screen.dart';
import 'favorites_screen.dart';
import 'my_donations_screen.dart';
import 'my_requests_screen.dart';
import 'manage_requests_screen.dart';
import 'notifications_screen.dart';
import 'profile_screen.dart';

import '../services/auth_service.dart';
import '../services/favorite_service.dart';
import '../services/notification_service.dart';
import 'chat_list_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    AuthService.syncCurrentUser();
  }

  Stream<int> _watchNotificationCount() {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null || currentUser.email == null) {
      return Stream<int>.value(0);
    }

    return NotificationService.watchUnreadCount(currentUser.uid);
  }

  Future<Map<String, int>> _loadDashboardStats() async {
    final currentUser = FirebaseAuth.instance.currentUser;

    if (currentUser == null || currentUser.email == null) {
      return {
        'totalBooks': 0,
        'myDonations': 0,
        'pendingRequests': 0,
        'favorites': 0,
      };
    }

    final booksSnapshot = await FirebaseFirestore.instance
        .collection('books')
        .get();

    final myDonationsSnapshot = await FirebaseFirestore.instance
        .collection('books')
        .where('donorId', isEqualTo: currentUser.uid)
        .get();

    final myRequestsSnapshot = await FirebaseFirestore.instance
        .collection('book_requests')
        .where('requesterId', isEqualTo: currentUser.uid)
        .get();

    final pendingRequests = myRequestsSnapshot.docs.where((doc) {
      final status = doc.data()['status']?.toString() ?? 'Pending';
      return status == 'Pending';
    }).length;

    final favorites = await FavoriteService.favoriteCount(currentUser.uid);

    return {
      'totalBooks': booksSnapshot.docs.length,
      'myDonations': myDonationsSnapshot.docs.length,
      'pendingRequests': pendingRequests,
      'favorites': favorites,
    };
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser;

    return Scaffold(
      // =========================================================
      // APP BAR
      // =========================================================
      appBar: AppBar(
        title: const Text(
          'Book Donation',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          StreamBuilder<int>(
            stream: _watchNotificationCount(),
            builder: (context, snapshot) {
              final notificationCount = snapshot.data ?? 0;

              return Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications),
                    onPressed: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const NotificationsScreen(),
                        ),
                      );

                      setState(() {});
                    },
                  ),

                  if (notificationCount > 0)
                    Positioned(
                      right: 7,
                      top: 7,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '$notificationCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),

      // =========================================================
      // BODY
      // =========================================================
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ===================================================
            // WELCOME CARD
            // ===================================================

            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 30,
                      child: Icon(Icons.person, size: 35),
                    ),

                    const SizedBox(width: 15),

                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Welcome!',
                            style: TextStyle(fontSize: 16, color: Colors.grey),
                          ),

                          const SizedBox(height: 4),

                          Text(
                            user?.name ?? 'User',
                            style: const TextStyle(
                              fontSize: 21,
                              fontWeight: FontWeight.bold,
                            ),
                          ),

                          const SizedBox(height: 3),

                          Text(
                            user?.email ?? '',
                            style: const TextStyle(color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 25),

            // ===================================================
            // MAIN TITLE
            // ===================================================
            const Text(
              'Book Donation',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),

            const SizedBox(height: 8),

            const Text(
              'Share books and help others discover new knowledge.',
              style: TextStyle(color: Colors.grey, fontSize: 15),
            ),

            const SizedBox(height: 20),

            FutureBuilder<Map<String, int>>(
              future: _loadDashboardStats(),
              builder: (context, snapshot) {
                final stats =
                    snapshot.data ??
                    {
                      'totalBooks': 0,
                      'myDonations': 0,
                      'pendingRequests': 0,
                      'favorites': 0,
                    };

                return GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.8,
                  children: [
                    _buildStatCard(
                      label: 'Books',
                      value: stats['totalBooks'].toString(),
                      color: Colors.indigo,
                      icon: Icons.library_books,
                    ),
                    _buildStatCard(
                      label: 'My Donations',
                      value: stats['myDonations'].toString(),
                      color: Colors.green,
                      icon: Icons.card_giftcard,
                    ),
                    _buildStatCard(
                      label: 'Pending',
                      value: stats['pendingRequests'].toString(),
                      color: Colors.orange,
                      icon: Icons.pending_actions,
                    ),
                    _buildStatCard(
                      label: 'Favorites',
                      value: stats['favorites'].toString(),
                      color: Colors.red,
                      icon: Icons.favorite,
                    ),
                  ],
                );
              },
            ),

            const SizedBox(height: 20),

            // ===================================================
            // BROWSE BOOKS
            // ===================================================
            _buildMenuCard(
              icon: Icons.menu_book,
              title: 'Browse Books',
              subtitle: 'Find books donated by others',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => BrowseBooksScreen()),
                );
              },
            ),

            // ===================================================
            // DONATE BOOK
            // ===================================================
            _buildMenuCard(
              icon: Icons.volunteer_activism,
              title: 'Donate Book',
              subtitle: 'Share your books with others',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const DonateBookScreen(),
                  ),
                );
              },
            ),

            // ===================================================
            // MY REQUESTS
            // ===================================================
            _buildMenuCard(
              icon: Icons.request_page,
              title: 'My Requests',
              subtitle: 'View books you have requested',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const MyRequestsScreen(),
                  ),
                );
              },
            ),

            // ===================================================
            // MY DONATIONS
            // ===================================================
            _buildMenuCard(
              icon: Icons.card_giftcard,
              title: 'My Donations',
              subtitle: 'View books you have donated',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => MyDonationsScreen()),
                );
              },
            ),

            // ===================================================
            // MANAGE REQUESTS
            // ===================================================
            _buildMenuCard(
              icon: Icons.manage_accounts,
              title: 'Manage Requests',
              subtitle: 'Approve or reject requests',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const ManageRequestsScreen(),
                  ),
                );
              },
            ),

            // ===================================================
            // MY FAVORITES
            // ===================================================
            _buildMenuCard(
              icon: Icons.favorite,
              title: 'My Favorites',
              subtitle: 'View books saved for later',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const FavoritesScreen(),
                  ),
                );
              },
            ),

            // ===================================================
            // MESSAGES
            // ===================================================
            _buildMenuCard(
              icon: Icons.chat_bubble,
              title: 'Messages',
              subtitle: 'Chat with donors and requesters',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const ChatListScreen(),
                  ),
                );
              },
            ),

            // ===================================================
            // NOTIFICATIONS
            // ===================================================
            StreamBuilder<int>(
              stream: _watchNotificationCount(),
              builder: (context, snapshot) {
                final notificationCount = snapshot.data ?? 0;

                return _buildMenuCard(
                  icon: Icons.notifications,
                  title: 'Notifications',
                  subtitle: notificationCount > 0
                      ? '$notificationCount new notification(s)'
                      : 'View your request updates',
                  showBadge: notificationCount > 0,
                  onTap: () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const NotificationsScreen(),
                      ),
                    );

                    setState(() {});
                  },
                );
              },
            ),

            // ===================================================
            // MY PROFILE
            // ===================================================
            _buildMenuCard(
              icon: Icons.person,
              title: 'My Profile',
              subtitle: 'View your profile and statistics',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => ProfileScreen()),
                );
              },
            ),

            const SizedBox(height: 20),

            // ===================================================
            // LOGOUT BUTTON
            // ===================================================
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.logout),

                label: const Text(
                  'Logout',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),

                onPressed: () {
                  _showLogoutDialog(context);
                },

                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required String label,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Card(
      elevation: 3,
      color: color.withAlpha(20),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 22),
                const Spacer(),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.black87,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // =============================================================
  // MENU CARD
  // =============================================================

  Widget _buildMenuCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool showBadge = false,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 3,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),

        leading: CircleAvatar(radius: 25, child: Icon(icon, size: 27)),

        title: Text(
          title,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
        ),

        subtitle: Text(subtitle),

        trailing: Stack(
          children: [
            const Padding(
              padding: EdgeInsets.all(8),
              child: Icon(Icons.arrow_forward_ios, size: 18),
            ),

            if (showBadge)
              Positioned(
                right: 0,
                top: 0,
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),

        onTap: onTap,
      ),
    );
  }

  // =============================================================
  // LOGOUT DIALOG
  // =============================================================

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Logout'),

          content: const Text('Are you sure you want to logout?'),

          actions: [
            // CANCEL
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
              },
              child: const Text('Cancel'),
            ),

            // LOGOUT
            ElevatedButton(
              onPressed: () {
                // Close dialog
                Navigator.pop(dialogContext);

                // Clear current user
                AuthService.logout();

                // Return to the first screen
                Navigator.popUntil(context, (route) => route.isFirst);
              },

              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),

              child: const Text('Logout'),
            ),
          ],
        );
      },
    );
  }
}
