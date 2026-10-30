import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  after,
  before,
  beforeEach,
  test,
} from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

const projectId = 'demo-bookshare';
const rulesPath = fileURLToPath(new URL('../firestore.rules', import.meta.url));
const rules = await readFile(rulesPath, 'utf8');

const donorId = 'donor-1';
const requesterId = 'requester-1';
const requestId = 'request-1';
const bookId = 'book-1';

const book = {
  title: 'A Book',
  author: 'A Writer',
  category: 'Fiction',
  condition: 'Good',
  description: 'A donated book.',
  donorId,
  donorName: 'Donor',
  donorEmail: 'donor@example.com',
};

const requestData = {
  bookId,
  bookTitle: book.title,
  bookAuthor: book.author,
  bookCategory: book.category,
  bookCondition: book.condition,
  bookDescription: book.description,
  donorId,
  donorName: book.donorName,
  donorEmail: book.donorEmail,
  requesterId,
  requesterName: 'Requester',
  requesterEmail: 'requester@example.com',
  status: 'Pending',
  createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
};

let testEnv;

function firestoreFor(userId, email) {
  return testEnv.authenticatedContext(userId, { email }).firestore();
}

async function seedRequest(status = 'Pending') {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'book_requests', requestId), {
      ...requestData,
      status,
    });
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'books', bookId), book);
  });
});

test('requesters can create requests only for the actual book and donor', async () => {
  const requesterDb = firestoreFor(requesterId, 'requester@example.com');
  const validRequest = { ...requestData, createdAt: serverTimestamp() };
  await assertSucceeds(
    setDoc(doc(requesterDb, 'book_requests', requestId), validRequest),
  );

  await assertFails(
    setDoc(doc(requesterDb, 'book_requests', 'forged-request'), {
      ...validRequest,
      donorId: 'attacker',
    }),
  );

  await assertFails(
    setDoc(doc(requesterDb, 'book_requests', 'extra-field-request'), {
      ...validRequest,
      isAdmin: true,
    }),
  );

  await assertFails(
    setDoc(doc(requesterDb, 'book_requests', 'spoofed-email-request'), {
      ...validRequest,
      requesterEmail: 'someone-else@example.com',
    }),
  );
});

test('users can save and remove only their own well-formed favorite books', async () => {
  const requesterDb = firestoreFor(requesterId, 'requester@example.com');
  const donorDb = firestoreFor(donorId, 'donor@example.com');
  const favorite = {
    bookId,
    title: book.title,
    author: book.author,
    category: book.category,
    condition: book.condition,
    description: book.description,
    donorName: book.donorName,
    donorEmail: book.donorEmail,
    imageUrl: null,
    isSample: false,
    savedAt: serverTimestamp(),
  };
  const favoriteRef = doc(
    requesterDb,
    'users',
    requesterId,
    'favorites',
    bookId,
  );

  await assertSucceeds(
    setDoc(doc(requesterDb, 'users', requesterId), {
      name: 'Requester',
      email: 'requester@example.com',
    }),
  );
  await assertSucceeds(setDoc(favoriteRef, favorite));
  await assertSucceeds(getDoc(favoriteRef));
  await assertFails(
    getDoc(doc(donorDb, 'users', requesterId, 'favorites', bookId)),
  );
  await assertFails(
    setDoc(
      doc(requesterDb, 'users', requesterId, 'favorites', 'invalid'),
      { ...favorite, savedAt: serverTimestamp(), isAdmin: true },
    ),
  );
  await assertSucceeds(deleteDoc(favoriteRef));
});

test('requesters can create only the matching chat room and link it once', async () => {
  const requesterDb = firestoreFor(requesterId, 'requester@example.com');
  await assertSucceeds(
    setDoc(doc(requesterDb, 'book_requests', requestId), {
      ...requestData,
      createdAt: serverTimestamp(),
    }),
  );

  const roomId = `room_${requestId}`;
  await assertSucceeds(
    getDoc(doc(requesterDb, 'chat_rooms', roomId)),
  );
  await assertSucceeds(
    setDoc(doc(requesterDb, 'chat_rooms', roomId), {
      requestId,
      bookId,
      bookTitle: book.title,
      donorId,
      donorName: book.donorName,
      requesterId,
      requesterName: 'Requester',
      participantIds: [donorId, requesterId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(requesterDb, 'book_requests', requestId), {
      chatRoomId: roomId,
    }),
  );
  await assertFails(
    updateDoc(doc(requesterDb, 'book_requests', requestId), {
      requesterName: 'Changed identity',
    }),
  );
});

test('only the donor can approve or reject a pending request', async () => {
  await seedRequest();
  const requesterDb = firestoreFor(requesterId, 'requester@example.com');
  const donorDb = firestoreFor(donorId, 'donor@example.com');
  const requestRef = doc(donorDb, 'book_requests', requestId);

  await assertFails(
    updateDoc(doc(requesterDb, 'book_requests', requestId), {
      status: 'Approved',
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(requestRef, {
      status: 'Approved',
      requesterId: donorId,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(requestRef, {
      status: 'Approved',
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(requestRef, {
      status: 'Rejected',
      updatedAt: serverTimestamp(),
    }),
  );
});

test('requesters can cancel pending requests but not completed requests', async () => {
  const requesterDb = firestoreFor(requesterId, 'requester@example.com');
  await seedRequest();
  await assertSucceeds(
    deleteDoc(doc(requesterDb, 'book_requests', requestId)),
  );

  await seedRequest('Approved');
  await assertFails(
    deleteDoc(doc(requesterDb, 'book_requests', requestId)),
  );
});

test('notifications are limited to the requester on the related decision', async () => {
  await seedRequest('Approved');
  const donorDb = firestoreFor(donorId, 'donor@example.com');
  const requesterDb = firestoreFor(requesterId, 'requester@example.com');
  const notification = {
    title: 'Request Approved',
    message: 'Your request was approved.',
    userId: requesterId,
    userEmail: 'requester@example.com',
    requestId,
    status: 'Approved',
    date: serverTimestamp(),
    isRead: false,
  };

  await assertFails(
    setDoc(doc(donorDb, 'notifications', 'client-notification'), notification),
  );
  await assertFails(
    setDoc(doc(donorDb, 'notifications', 'spoofed-notification'), {
      ...notification,
      userId: 'another-user',
    }),
  );
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), 'notifications', 'valid-notification'),
      {
        ...notification,
        date: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
      },
    );
  });
  await assertFails(
    getDoc(doc(donorDb, 'notifications', 'valid-notification')),
  );
  await assertSucceeds(
    getDoc(doc(requesterDb, 'notifications', 'valid-notification')),
  );
  await assertSucceeds(
    updateDoc(doc(requesterDb, 'notifications', 'valid-notification'), {
      isRead: true,
    }),
  );
  await assertFails(
    updateDoc(doc(requesterDb, 'notifications', 'valid-notification'), {
      title: 'Edited notification',
      isRead: true,
    }),
  );
});

test('only a requester with an approved request can create a valid book review', async () => {
  await seedRequest('Approved');
  const requesterDb = firestoreFor(requesterId, 'requester@example.com');
  const donorDb = firestoreFor(donorId, 'donor@example.com');
  const review = {
    bookId,
    requestId,
    reviewerId: requesterId,
    reviewerEmail: 'requester@example.com',
    reviewerName: 'Requester',
    rating: 5,
    comment: 'A great book.',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await assertSucceeds(
    setDoc(
      doc(requesterDb, 'book_reviews', bookId, 'reviews', requesterId),
      review,
    ),
  );
  await assertFails(
    setDoc(
      doc(donorDb, 'book_reviews', bookId, 'reviews', donorId),
      { ...review, reviewerId: donorId, reviewerEmail: 'donor@example.com' },
    ),
  );
  await assertFails(
    setDoc(
      doc(requesterDb, 'book_reviews', bookId, 'reviews', 'another-user'),
      { ...review, reviewerId: 'another-user' },
    ),
  );
  await assertFails(
    setDoc(
      doc(requesterDb, 'book_reviews', bookId, 'reviews', 'invalid-rating'),
      { ...review, rating: 6 },
    ),
  );
});

test('reviews require an approved request and can only be edited by their author', async () => {
  await seedRequest();
  const requesterDb = firestoreFor(requesterId, 'requester@example.com');
  const reviewRef = doc(
    requesterDb,
    'book_reviews',
    bookId,
    'reviews',
    requesterId,
  );
  const review = {
    bookId,
    requestId,
    reviewerId: requesterId,
    reviewerEmail: 'requester@example.com',
    reviewerName: 'Requester',
    rating: 4,
    comment: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await assertFails(setDoc(reviewRef, review));
  await seedRequest('Approved');
  await assertSucceeds(setDoc(reviewRef, review));
  await assertSucceeds(
    updateDoc(reviewRef, {
      rating: 3,
      comment: 'Updated review.',
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(reviewRef, {
      reviewerName: 'Someone else',
      updatedAt: serverTimestamp(),
    }),
  );
});
