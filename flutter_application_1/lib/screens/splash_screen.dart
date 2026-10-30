import 'package:flutter/material.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEEF9F0),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(30),
              decoration: BoxDecoration(
                color: Colors.green.shade100,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.menu_book, size: 100, color: Colors.green),
            ),

            const SizedBox(height: 24),

            const Text(
              'BookShare',
              style: TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),

            const SizedBox(height: 12),

            const Text(
              'Share a book, spread the knowledge',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),

            const SizedBox(height: 28),

            const CircularProgressIndicator(color: Colors.green),
          ],
        ),
      ),
    );
  }
}
