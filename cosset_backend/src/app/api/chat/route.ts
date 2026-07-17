import type { NextRequest } from 'next/server';

import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';
import { STATUS, response, handleError } from 'src/utils/response';
import { getUserById, getUsersBriefByIds, type UserBrief } from 'src/models/users';
import {
  addChatContact,
  appendMessage,
  createConversationWithParticipants,
  deleteConversation,
  findOneToOneConversation,
  getConversationById,
  getUnreadCount,
  listChatContactIds,
  listConversationIdsForUser,
  listMessages,
  listParticipants,
  markConversationSeen,
  removeChatContact,
  userIsConversationParticipant,
} from 'src/models/chat';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const ENDPOINTS = {
  CONVERSATIONS: 'conversations',
  CONVERSATION: 'conversation',
  MARK_AS_SEEN: 'mark-as-seen',
  CONTACTS: 'contacts',
};

const getUserIdFromRequest = async (req: NextRequest): Promise<string | null> => {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authorization.split(' ')[1];

  try {
    const data = await verify(accessToken, JWT_SECRET);
    return typeof data?.userId === 'string' && data.userId ? data.userId.trim().toLowerCase() : null;
  } catch {
    return null;
  }
};

const displayNameFromUser = (user: UserBrief | undefined | null): string => {
  const fromProfile = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fromProfile || user?.email?.split('@')[0] || 'Member';
};

const toParticipant = (user: UserBrief) => ({
  id: String(user.id),
  name: displayNameFromUser(user),
  role: '',
  email: user.email || '',
  address: '',
  avatarUrl: user.photoURL || '',
  phoneNumber: '',
  lastActivity: new Date().toISOString(),
  status: 'offline' as const,
});

const toApiMessage = (row: {
  id: string;
  senderId: string;
  body: string;
  contentType: string;
  createdAt: Date | string;
}) => ({
  id: row.id,
  body: row.body,
  senderId: row.senderId,
  contentType: row.contentType || 'text',
  createdAt: row.createdAt,
  attachments: [] as unknown[],
});

async function buildConversationPayload(conversationId: string, currentUserId: string) {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    return null;
  }

  const isMember = await userIsConversationParticipant(conversationId, currentUserId);
  if (!isMember) {
    return null;
  }

  const [participantRows, messages, unreadCount] = await Promise.all([
    listParticipants(conversationId),
    listMessages(conversationId),
    getUnreadCount(conversationId, currentUserId),
  ]);

  const usersBrief = await getUsersBriefByIds(participantRows.map((row) => row.userId));
  const participants = participantRows
    .map((row) => {
      const user = usersBrief.get(row.userId.trim().toLowerCase());
      return user ? toParticipant(user) : null;
    })
    .filter(Boolean);

  return {
    id: conversation.id,
    type: conversation.type,
    unreadCount,
    participants,
    messages: messages.map(toApiMessage),
  };
}

async function getContactUserIds(userId: string): Promise<string[]> {
  const ids = await listChatContactIds(userId);
  return ids.filter((id) => id !== userId);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const endpoint = searchParams.get('endpoint');

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to use chat' }, STATUS.UNAUTHORIZED);
    }

    switch (endpoint) {
      case ENDPOINTS.CONTACTS: {
        const contactIds = await getContactUserIds(userId);
        const usersBrief = await getUsersBriefByIds(contactIds);
        const contacts = contactIds
          .map((id) => usersBrief.get(id))
          .filter(Boolean)
          .map((user) => toParticipant(user!));

        return response({ contacts }, STATUS.OK);
      }

      case ENDPOINTS.CONVERSATIONS: {
        const conversationIds = await listConversationIdsForUser(userId);
        const conversations = (
          await Promise.all(conversationIds.map((id) => buildConversationPayload(id, userId)))
        ).filter(Boolean);

        conversations.sort((a, b) => {
          const aTime = a!.messages[a!.messages.length - 1]?.createdAt || 0;
          const bTime = b!.messages[b!.messages.length - 1]?.createdAt || 0;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        return response({ conversations }, STATUS.OK);
      }

      case ENDPOINTS.CONVERSATION: {
        const conversationId = searchParams.get('conversationId') || '';
        const conversation = await buildConversationPayload(conversationId, userId);
        if (!conversation) {
          return response({ message: 'Conversation not found!' }, STATUS.NOT_FOUND);
        }
        return response({ conversation }, STATUS.OK);
      }

      case ENDPOINTS.MARK_AS_SEEN: {
        const conversationId = searchParams.get('conversationId') || '';
        if (conversationId) {
          await markConversationSeen(conversationId, userId);
        }
        return response({ success: true }, STATUS.OK);
      }

      default:
        return response({ message: 'Endpoint not found' }, STATUS.NOT_FOUND);
    }
  } catch (error) {
    return handleError(`Chat - Get ${endpoint}`, error as Error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to use chat' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();

    if (body?.endpoint === ENDPOINTS.CONTACTS) {
      const contactUserId = String(body?.contactUserId || '')
        .trim()
        .toLowerCase();

      if (!contactUserId || contactUserId === userId) {
        return response({ message: 'Invalid contact' }, STATUS.BAD_REQUEST);
      }

      const contactUser = await getUserById(contactUserId);
      if (!contactUser) {
        return response({ message: 'User not found' }, STATUS.NOT_FOUND);
      }

      const added = await addChatContact(userId, contactUserId);
      if (!added) {
        return response({ message: 'Could not add contact' }, STATUS.BAD_REQUEST);
      }

      const contact = toParticipant({
        id: contactUser.id,
        email: contactUser.email,
        firstName: contactUser.firstName,
        lastName: contactUser.lastName,
        photoURL: contactUser.photoURL,
      } as UserBrief);

      let conversation = null;
      const existing = await findOneToOneConversation(userId, contactUserId);
      if (existing) {
        conversation = await buildConversationPayload(existing.id, userId);
      } else {
        const created = await createConversationWithParticipants({
          id: crypto.randomUUID(),
          type: 'ONE_TO_ONE',
          participantIds: [userId, contactUserId],
        });
        conversation = await buildConversationPayload(created.id, userId);
      }

      return response({ contact, conversation }, STATUS.OK);
    }

    const conversationData = body?.conversationData;
    if (!conversationData) {
      return response({ message: 'Conversation data is required' }, STATUS.BAD_REQUEST);
    }

    const incomingParticipants = Array.isArray(conversationData.participants)
      ? conversationData.participants
      : [];
    const participantIds = [
      ...new Set(
        [
          userId,
          ...incomingParticipants.map((participant: { id?: string }) =>
            String(participant?.id || '')
              .trim()
              .toLowerCase(),
          ),
        ].filter(Boolean),
      ),
    ];

    if (participantIds.length < 2) {
      return response({ message: 'At least one recipient is required' }, STATUS.BAD_REQUEST);
    }

    const type =
      String(conversationData.type || '').toUpperCase() === 'GROUP' || participantIds.length > 2
        ? 'GROUP'
        : 'ONE_TO_ONE';

    let conversationId = String(conversationData.id || '').trim().toLowerCase();

    if (type === 'ONE_TO_ONE') {
      const otherId = participantIds.find((id) => id !== userId);
      if (otherId) {
        const existing = await findOneToOneConversation(userId, otherId);
        if (existing) {
          conversationId = existing.id;
        } else if (!conversationId) {
          conversationId = crypto.randomUUID();
        }
      }
    }

    if (!conversationId) {
      conversationId = crypto.randomUUID();
    }

    const created = await createConversationWithParticipants({
      id: conversationId,
      type,
      participantIds,
    });

    const firstMessage = Array.isArray(conversationData.messages)
      ? conversationData.messages[0]
      : null;

    if (firstMessage?.body && firstMessage?.id) {
      await appendMessage({
        id: String(firstMessage.id),
        conversationId: created.id,
        senderId: userId,
        body: String(firstMessage.body),
        contentType: String(firstMessage.contentType || 'text'),
      });
    }

    const conversation = await buildConversationPayload(created.id, userId);
    return response({ conversation }, STATUS.OK);
  } catch (error) {
    return handleError('Chat - Create conversation', error as Error);
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const endpoint = searchParams.get('endpoint');

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to use chat' }, STATUS.UNAUTHORIZED);
    }

    if (endpoint !== ENDPOINTS.CONTACTS) {
      return response({ message: 'Endpoint not found' }, STATUS.NOT_FOUND);
    }

    const contactUserId = String(searchParams.get('contactUserId') || '')
      .trim()
      .toLowerCase();
    const conversationIdParam = String(searchParams.get('conversationId') || '')
      .trim()
      .toLowerCase();

    if (!contactUserId) {
      return response({ message: 'contactUserId is required' }, STATUS.BAD_REQUEST);
    }

    await removeChatContact(userId, contactUserId);

    let deletedConversationId: string | null = null;

    if (conversationIdParam) {
      const isMember = await userIsConversationParticipant(conversationIdParam, userId);
      if (isMember) {
        await deleteConversation(conversationIdParam);
        deletedConversationId = conversationIdParam;
      }
    }

    if (!deletedConversationId) {
      const existing = await findOneToOneConversation(userId, contactUserId);
      if (existing) {
        await deleteConversation(existing.id);
        deletedConversationId = existing.id;
      }
    }

    return response(
      { success: true, deletedConversationId },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Chat - Remove contact', error as Error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to use chat' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();
    const conversationId = String(body?.conversationId || '')
      .trim()
      .toLowerCase();
    const messageData = body?.messageData;

    if (!conversationId || !messageData?.id || !messageData?.body) {
      return response({ message: 'Invalid message payload' }, STATUS.BAD_REQUEST);
    }

    const isMember = await userIsConversationParticipant(conversationId, userId);
    if (!isMember) {
      return response({ message: 'Conversation not found!' }, STATUS.NOT_FOUND);
    }

    await appendMessage({
      id: String(messageData.id),
      conversationId,
      senderId: userId,
      body: String(messageData.body),
      contentType: String(messageData.contentType || 'text'),
    });

    const conversation = await buildConversationPayload(conversationId, userId);
    return response({ conversation }, STATUS.OK);
  } catch (error) {
    return handleError('Chat - Update conversation', error as Error);
  }
}
