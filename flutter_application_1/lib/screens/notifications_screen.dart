import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../models/notification.dart';
import '../services/notification_service.dart';
import 'chat_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _markingAllRead = false;

  Future<void> _markAllRead(String userId) async {
    setState(() => _markingAllRead = true);
    try {
      await NotificationService.markAllAsRead(userId);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not mark notifications as read: $error'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _markingAllRead = false);
    }
  }

  Future<void> _openNotification(
    AppNotification notification,
    String userId,
  ) async {
    try {
      if (!notification.isRead) {
        await NotificationService.markAsRead(
          notificationId: notification.id,
        );
      }

      final roomId = notification.chatRoomId;
      if (notification.type != 'chat_message' ||
          roomId == null ||
          !mounted) {
        return;
      }

      final room = await FirebaseFirestore.instance
          .collection('chat_rooms')
          .doc(roomId)
          .get();
      if (!mounted) return;
      if (!room.exists) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('This conversation is no longer available.')),
        );
        return;
      }

      final data = room.data()!;
      final otherUserName = data['requesterId'] == userId
          ? data['donorName']?.toString() ?? 'Donor'
          : data['requesterName']?.toString() ?? 'Requester';
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ChatScreen(
            roomId: roomId,
            bookTitle: data['bookTitle']?.toString() ?? 'Book chat',
            otherUserName: otherUserName,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not open notification: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Notifications')),
        body: const Center(
          child: Text(
            'Please login to view notifications.',
            style: TextStyle(fontSize: 16),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: _markingAllRead ? null : () => _markAllRead(user.uid),
            child: _markingAllRead
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text(
                    'Mark all read',
                    style: TextStyle(color: Colors.white),
                  ),
          ),
        ],
      ),
      body: StreamBuilder<List<AppNotification>>(
        stream: NotificationService.watchNotifications(user.uid),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Could not load notifications: ${snapshot.error}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
            );
          }
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final notifications = snapshot.data ?? [];
          if (notifications.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none, size: 80, color: Colors.grey),
                  SizedBox(height: 15),
                  Text(
                    'No notifications yet',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Request updates and messages will appear here.',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: notifications.length,
            itemBuilder: (context, index) {
              final notification = notifications[index];
              final isMessage = notification.type == 'chat_message';
              final isApproved = notification.status == 'Approved' ||
                  notification.title == 'Request Approved';
              final color = isMessage
                  ? Colors.blue
                  : isApproved
                  ? Colors.green
                  : Colors.red;

              return Card(
                color: notification.isRead ? Colors.white : color.withAlpha(18),
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  onTap: () => _openNotification(notification, user.uid),
                  leading: CircleAvatar(
                    backgroundColor: color,
                    child: Icon(
                      isMessage
                          ? Icons.chat_bubble
                          : isApproved
                          ? Icons.check
                          : Icons.close,
                      color: Colors.white,
                    ),
                  ),
                  title: Text(
                    notification.title,
                    style: TextStyle(
                      fontWeight: notification.isRead
                          ? FontWeight.normal
                          : FontWeight.bold,
                    ),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(notification.message),
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${notification.date.day}/'
                        '${notification.date.month}/'
                        '${notification.date.year}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      if (!notification.isRead)
                        const Padding(
                          padding: EdgeInsets.only(top: 6),
                          child: CircleAvatar(
                            radius: 4,
                            backgroundColor: Colors.green,
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
