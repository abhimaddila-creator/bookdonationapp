import '../models/book.dart';

class BookService {
  // Books available for browsing
  static final List<Book> books = [
    Book(
      title: 'Wings of Fire',
      author: 'A.P.J. Abdul Kalam',
      category: 'Biography',
      condition: 'Good',
      description: 'An inspiring autobiography about the life and achievements of Dr. A.P.J. Abdul Kalam.',
      donorName: 'BookShare Library',
      donorEmail: 'library@bookshare.com',
      isSample: true,
    ),

    Book(
      title: 'The Alchemist',
      author: 'Paulo Coelho',
      category: 'Fiction',
      condition: 'Very Good',
      description: 'A popular inspirational novel about following your dreams and discovering your purpose.',
      donorName: 'BookShare Library',
      donorEmail: 'library@bookshare.com',
      isSample: true,
    ),

    Book(
      title: 'Atomic Habits',
      author: 'James Clear',
      category: 'Self Help',
      condition: 'Good',
      description: 'A practical guide to building good habits, breaking bad ones, and improving every day.',
      donorName: 'BookShare Library',
      donorEmail: 'library@bookshare.com',
      isSample: true,
    ),

    Book(
      title: 'Rich Dad Poor Dad',
      author: 'Robert Kiyosaki',
      category: 'Finance',
      condition: 'Good',
      description: 'A popular book about financial education, money management, and building wealth.',
      donorName: 'BookShare Library',
      donorEmail: 'library@bookshare.com',
      isSample: true,
    ),

    Book(
      title: 'Think and Grow Rich',
      author: 'Napoleon Hill',
      category: 'Self Help',
      condition: 'Good',
      description: 'A classic personal-development book about success, goals, and developing a positive mindset.',
      donorName: 'BookShare Library',
      donorEmail: 'library@bookshare.com',
      isSample: true,
    ),

    Book(
      title: 'The Power of Your Subconscious Mind',
      author: 'Joseph Murphy',
      category: 'Personal Development',
      condition: 'Very Good',
      description: 'A book exploring the influence of the subconscious mind on thoughts, habits, and personal growth.',
      donorName: 'BookShare Library',
      donorEmail: 'library@bookshare.com',
      isSample: true,
    ),
  ];

  // Books donated by users
  static final List<Book> donatedBooks = [];

  // Add a donated book
  static void addBook(Book book) {
    books.add(book);
    donatedBooks.add(book);
  }

  // Get all donated books
  static List<Book> getDonatedBooks() {
    return donatedBooks;
  }

}
