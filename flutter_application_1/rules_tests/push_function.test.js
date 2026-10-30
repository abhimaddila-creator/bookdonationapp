import assert from 'node:assert/strict';
import {
  after,
  before,
  test,
} from 'node:test';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const projectId = 'demo-bookshare';
const requestId = 'push-request-1';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({ projectId });
});

after(async () => {
  await testEnv.cleanup();
});

test('a request decision creates its in-app notification through the function', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'book_requests', requestId), {
      status: 'Pending',
      requesterId: 'requester-1',
      requesterEmail: 'requester@example.com',
      bookTitle: 'A Book',
    });
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(
      doc(context.firestore(), 'book_requests', requestId),
      { status: 'Approved' },
    );
  });

  let notificationSnapshot;
  for (let attempt = 0; attempt < 100; attempt++) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      notificationSnapshot = await getDoc(
        doc(context.firestore(), 'notifications', `${requestId}_approved`),
      );
    });
    if (notificationSnapshot?.exists()) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  assert.ok(notificationSnapshot?.exists());
  assert.equal(notificationSnapshot.data().userId, 'requester-1');
  assert.equal(notificationSnapshot.data().requestId, requestId);
  assert.equal(notificationSnapshot.data().status, 'Approved');
  assert.equal(notificationSnapshot.data().isRead, false);
});

test('a chat message notifies the other conversation participant', async () => {
  const roomId = 'room_push-chat-1';
  const messageId = 'message-push-chat-1';

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, 'chat_rooms', roomId), {
      requestId: 'push-chat-1',
      bookId: 'book-chat-1',
      bookTitle: 'A Book',
      donorId: 'donor-chat-1',
      requesterId: 'requester-chat-1',
      participantIds: ['donor-chat-1', 'requester-chat-1'],
    });
    await setDoc(doc(firestore, 'users', 'requester-chat-1'), {
      email: 'requester@example.com',
    });
    await setDoc(
      doc(firestore, 'chat_rooms', roomId, 'messages', messageId),
      {
        senderId: 'donor-chat-1',
        senderName: 'Donor',
        text: 'The book is ready.',
      },
    );
  });

  let notificationSnapshot;
  for (let attempt = 0; attempt < 100; attempt++) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      notificationSnapshot = await getDoc(
        doc(
          context.firestore(),
          'notifications',
          `${roomId}_${messageId}_requester-chat-1`,
        ),
      );
    });
    if (notificationSnapshot?.exists()) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  assert.ok(notificationSnapshot?.exists());
  assert.equal(notificationSnapshot.data().userId, 'requester-chat-1');
  assert.equal(notificationSnapshot.data().type, 'chat_message');
  assert.equal(notificationSnapshot.data().chatRoomId, roomId);
  assert.equal(notificationSnapshot.data().message, 'The book is ready.');

  let senderNotification;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    senderNotification = await getDoc(
      doc(
        context.firestore(),
        'notifications',
        `${roomId}_${messageId}_donor-chat-1`,
      ),
    );
  });
  assert.equal(senderNotification.exists(), false);
});
