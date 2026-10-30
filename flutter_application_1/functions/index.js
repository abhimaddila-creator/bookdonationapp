const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { logger } = require('firebase-functions');
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require('firebase-functions/v2/firestore');

initializeApp();

const db = getFirestore();

async function notifyUser(userId, title, body, data, context) {
  const userSnapshot = await db.collection('users').doc(userId).get();
  const tokens = userSnapshot.data()?.fcmTokens;
  if (!Array.isArray(tokens) || tokens.length === 0) return;

  const invalidTokens = [];
  for (let index = 0; index < tokens.length; index += 500) {
    const tokenChunk = tokens.slice(index, index + 500);
    const result = await getMessaging().sendEachForMulticast({
      tokens: tokenChunk,
      notification: { title, body },
      data,
    });

    result.responses.forEach((response, responseIndex) => {
      if (response.success) return;

      const code = response.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(tokenChunk[responseIndex]);
      } else {
        logger.warn('Push notification delivery failed', {
          ...context,
          code,
        });
      }
    });
  }

  if (invalidTokens.length > 0) {
    await db.collection('users').doc(userId).update({
      fcmTokens: FieldValue.arrayRemove(...invalidTokens),
    });
  }
}

async function createNotification(notificationId, notification, context) {
  try {
    await db.collection('notifications').doc(notificationId).create({
      ...notification,
      date: FieldValue.serverTimestamp(),
      isRead: false,
    });
    return true;
  } catch (error) {
    if (error.code === 6 || error.code === 'already-exists') {
      logger.info('Notification already created', context);
      return false;
    }
    throw error;
  }
}

exports.notifyRequestDecision = onDocumentUpdated(
  'book_requests/{requestId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const status = after.status;
    if (
      before.status === status ||
      !['Approved', 'Rejected'].includes(status)
    ) {
      return;
    }

    const { requestId } = event.params;
    const title =
      status === 'Approved' ? 'Request Approved' : 'Request Rejected';
    const bookTitle = after.bookTitle || 'your requested book';
    const body =
      status === 'Approved'
        ? `Your request for "${bookTitle}" was approved.`
        : `Your request for "${bookTitle}" was rejected.`;
    const notificationRef = db
      .collection('notifications')
      .doc(`${requestId}_${status.toLowerCase()}`);

    try {
      await notificationRef.create({
        title,
        message: body,
        userId: after.requesterId,
        userEmail: after.requesterEmail || '',
        requestId,
        status,
        type: 'request_decision',
        date: FieldValue.serverTimestamp(),
        isRead: false,
      });
    } catch (error) {
      if (error.code === 6 || error.code === 'already-exists') {
        logger.info('Notification already created for request decision', {
          requestId,
          status,
        });
        return;
      }
      throw error;
    }

    await notifyUser(
      after.requesterId,
      title,
      body,
      { type: 'request_decision', requestId, status },
      { requestId, status },
    );
  },
);

exports.notifyChatMessage = onDocumentCreated(
  'chat_rooms/{roomId}/messages/{messageId}',
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const roomSnapshot = await db
      .collection('chat_rooms')
      .doc(event.params.roomId)
      .get();
    if (!roomSnapshot.exists) return;

    const room = roomSnapshot.data();
    const participants = room?.participantIds;
    if (!Array.isArray(participants)) {
      logger.error('Chat room has no valid participant list', {
        roomId: event.params.roomId,
        messageId: event.params.messageId,
      });
      return;
    }

    const recipientIds = participants.filter(
      (participantId) =>
        typeof participantId === 'string' &&
        participantId !== message.senderId,
    );
    if (recipientIds.length === 0) return;

    const senderName = message.senderName || 'A BookShare user';
    const bookTitle = room.bookTitle || 'your book chat';
    const messageText = String(message.text || '').trim();
    const body =
      messageText.length > 120
        ? `${messageText.slice(0, 117)}...`
        : messageText;
    const notificationId =
      `${event.params.roomId}_${event.params.messageId}`;

    await Promise.all(
      recipientIds.map(async (recipientId) => {
        const recipientIsRequester = room.requesterId === recipientId;
        const recipientEmail = recipientIsRequester
          ? room.requesterEmail
          : room.donorEmail;
        await createNotification(
          `${notificationId}_${recipientId}`,
          {
            title: `New message from ${senderName}`,
            message: body || `New message about "${bookTitle}".`,
            userId: recipientId,
            userEmail: recipientEmail || '',
            requestId: room.requestId || '',
            status: 'Message',
            type: 'chat_message',
            chatRoomId: event.params.roomId,
            messageId: event.params.messageId,
          },
          {
            roomId: event.params.roomId,
            messageId: event.params.messageId,
            recipientId,
          },
        );

        await notifyUser(
          recipientId,
          `New message from ${senderName}`,
          body || `New message about "${bookTitle}".`,
          {
            type: 'chat_message',
            chatRoomId: event.params.roomId,
            requestId: String(room.requestId || ''),
          },
          {
            roomId: event.params.roomId,
            messageId: event.params.messageId,
            recipientId,
          },
        );
      }),
    );
  },
);
