import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

const CONVERSATIONS_TABLE = 'chat_conversations';
const PARTICIPANTS_TABLE = 'chat_conversation_participants';
const MESSAGES_TABLE = 'chat_messages';
const CONTACTS_TABLE = 'chat_contacts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let ensureTablesPromise: Promise<void> | null = null;

export type ChatConversationRow = {
  id: string;
  type: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ChatMessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  contentType: string;
  createdAt: Date | string;
};

export type ChatParticipantRow = {
  conversationId: string;
  userId: string;
  unreadCount: number;
};

const ensureChatTables = async (): Promise<void> => {
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${CONVERSATIONS_TABLE} (
            id UUID PRIMARY KEY,
            type VARCHAR(24) NOT NULL DEFAULT 'ONE_TO_ONE',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${PARTICIPANTS_TABLE} (
            conversation_id UUID NOT NULL REFERENCES ${CONVERSATIONS_TABLE}(id) ON DELETE CASCADE,
            user_id UUID NOT NULL,
            unread_count INT NOT NULL DEFAULT 0,
            PRIMARY KEY (conversation_id, user_id)
          )
        `,
      );

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${MESSAGES_TABLE} (
            id UUID PRIMARY KEY,
            conversation_id UUID NOT NULL REFERENCES ${CONVERSATIONS_TABLE}(id) ON DELETE CASCADE,
            sender_id UUID NOT NULL,
            body TEXT NOT NULL,
            content_type VARCHAR(40) NOT NULL DEFAULT 'text',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON ${PARTICIPANTS_TABLE} (user_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON ${MESSAGES_TABLE} (conversation_id, created_at)`,
      );

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${CONTACTS_TABLE} (
            owner_user_id UUID NOT NULL,
            contact_user_id UUID NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (owner_user_id, contact_user_id)
          )
        `,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_chat_contacts_owner ON ${CONTACTS_TABLE} (owner_user_id)`,
      );
    })().catch((error) => {
      ensureTablesPromise = null;
      throw error;
    });
  }

  await ensureTablesPromise;
};

const isUuid = (value: string) => UUID_RE.test(String(value || '').trim());

export async function listConversationIdsForUser(userId: string): Promise<string[]> {
  const normalized = userId.trim().toLowerCase();
  if (!isUuid(normalized)) return [];

  await ensureChatTables();

  const rows = await queryMany<{ conversationId: string }>(
    `
      SELECT conversation_id::text AS "conversationId"
      FROM ${PARTICIPANTS_TABLE}
      WHERE user_id = $1
      ORDER BY conversation_id
    `,
    [normalized],
  );

  return rows.map((row) => row.conversationId);
}

export async function getConversationById(conversationId: string): Promise<ChatConversationRow | null> {
  const id = conversationId.trim().toLowerCase();
  if (!isUuid(id)) return null;

  await ensureChatTables();

  return queryOne<ChatConversationRow>(
    `
      SELECT
        id::text AS id,
        type,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM ${CONVERSATIONS_TABLE}
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );
}

export async function userIsConversationParticipant(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const cid = conversationId.trim().toLowerCase();
  const uid = userId.trim().toLowerCase();
  if (!isUuid(cid) || !isUuid(uid)) return false;

  await ensureChatTables();

  const row = await queryOne<{ ok: number }>(
    `
      SELECT 1 AS ok
      FROM ${PARTICIPANTS_TABLE}
      WHERE conversation_id = $1 AND user_id = $2
      LIMIT 1
    `,
    [cid, uid],
  );

  return Boolean(row);
}

export async function listParticipants(conversationId: string): Promise<ChatParticipantRow[]> {
  const cid = conversationId.trim().toLowerCase();
  if (!isUuid(cid)) return [];

  await ensureChatTables();

  return queryMany<ChatParticipantRow>(
    `
      SELECT
        conversation_id::text AS "conversationId",
        user_id::text AS "userId",
        unread_count AS "unreadCount"
      FROM ${PARTICIPANTS_TABLE}
      WHERE conversation_id = $1
    `,
    [cid],
  );
}

export async function listMessages(conversationId: string): Promise<ChatMessageRow[]> {
  const cid = conversationId.trim().toLowerCase();
  if (!isUuid(cid)) return [];

  await ensureChatTables();

  return queryMany<ChatMessageRow>(
    `
      SELECT
        id::text AS id,
        conversation_id::text AS "conversationId",
        sender_id::text AS "senderId",
        body,
        content_type AS "contentType",
        created_at AS "createdAt"
      FROM ${MESSAGES_TABLE}
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `,
    [cid],
  );
}

export async function getUnreadCount(conversationId: string, userId: string): Promise<number> {
  const cid = conversationId.trim().toLowerCase();
  const uid = userId.trim().toLowerCase();
  if (!isUuid(cid) || !isUuid(uid)) return 0;

  await ensureChatTables();

  const row = await queryOne<{ unreadCount: number }>(
    `
      SELECT unread_count AS "unreadCount"
      FROM ${PARTICIPANTS_TABLE}
      WHERE conversation_id = $1 AND user_id = $2
      LIMIT 1
    `,
    [cid, uid],
  );

  return row?.unreadCount ?? 0;
}

export async function findOneToOneConversation(
  userIdA: string,
  userIdB: string,
): Promise<ChatConversationRow | null> {
  const a = userIdA.trim().toLowerCase();
  const b = userIdB.trim().toLowerCase();
  if (!isUuid(a) || !isUuid(b) || a === b) return null;

  await ensureChatTables();

  return queryOne<ChatConversationRow>(
    `
      SELECT
        c.id::text AS id,
        c.type,
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt"
      FROM ${CONVERSATIONS_TABLE} c
      WHERE c.type = 'ONE_TO_ONE'
        AND EXISTS (
          SELECT 1 FROM ${PARTICIPANTS_TABLE} p1
          WHERE p1.conversation_id = c.id AND p1.user_id = $1
        )
        AND EXISTS (
          SELECT 1 FROM ${PARTICIPANTS_TABLE} p2
          WHERE p2.conversation_id = c.id AND p2.user_id = $2
        )
        AND (
          SELECT COUNT(*) FROM ${PARTICIPANTS_TABLE} p WHERE p.conversation_id = c.id
        ) = 2
      ORDER BY c.updated_at DESC
      LIMIT 1
    `,
    [a, b],
  );
}

export async function createConversationWithParticipants(input: {
  id: string;
  type: string;
  participantIds: string[];
}): Promise<ChatConversationRow> {
  const id = input.id.trim().toLowerCase();
  const type = (input.type || 'ONE_TO_ONE').trim().toUpperCase() || 'ONE_TO_ONE';
  const participantIds = [
    ...new Set(input.participantIds.map((value) => value.trim().toLowerCase()).filter(isUuid)),
  ];

  if (!isUuid(id) || participantIds.length < 2) {
    throw new DatabaseError({
      code: 'CHAT_CREATE_INVALID',
      message: 'Invalid conversation participants',
    });
  }

  await ensureChatTables();

  const created = await queryOne<ChatConversationRow>(
    `
      INSERT INTO ${CONVERSATIONS_TABLE} (id, type, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
      RETURNING
        id::text AS id,
        type,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [id, type],
  );

  if (!created) {
    throw new DatabaseError({
      code: 'CHAT_CREATE_FAILED',
      message: 'Failed to create conversation',
    });
  }

  await Promise.all(
    participantIds.map((userId) =>
      executeQuery(
        `
          INSERT INTO ${PARTICIPANTS_TABLE} (conversation_id, user_id, unread_count)
          VALUES ($1, $2, 0)
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `,
        [id, userId],
      ),
    ),
  );

  return created;
}

export async function appendMessage(input: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  contentType?: string;
}): Promise<ChatMessageRow> {
  const id = input.id.trim().toLowerCase();
  const conversationId = input.conversationId.trim().toLowerCase();
  const senderId = input.senderId.trim().toLowerCase();
  const body = String(input.body || '').trim();
  const contentType = String(input.contentType || 'text').trim() || 'text';

  if (!isUuid(id) || !isUuid(conversationId) || !isUuid(senderId) || !body) {
    throw new DatabaseError({
      code: 'CHAT_MESSAGE_INVALID',
      message: 'Invalid chat message',
    });
  }

  await ensureChatTables();

  const inserted = await queryOne<ChatMessageRow>(
    `
      INSERT INTO ${MESSAGES_TABLE} (id, conversation_id, sender_id, body, content_type, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING
        id::text AS id,
        conversation_id::text AS "conversationId",
        sender_id::text AS "senderId",
        body,
        content_type AS "contentType",
        created_at AS "createdAt"
    `,
    [id, conversationId, senderId, body.slice(0, 4000), contentType.slice(0, 40)],
  );

  if (!inserted) {
    throw new DatabaseError({
      code: 'CHAT_MESSAGE_INSERT_FAILED',
      message: 'Failed to save chat message',
    });
  }

  await executeQuery(
    `UPDATE ${CONVERSATIONS_TABLE} SET updated_at = NOW() WHERE id = $1`,
    [conversationId],
  );

  await executeQuery(
    `
      UPDATE ${PARTICIPANTS_TABLE}
      SET unread_count = unread_count + 1
      WHERE conversation_id = $1 AND user_id <> $2
    `,
    [conversationId, senderId],
  );

  return inserted;
}

export async function markConversationSeen(
  conversationId: string,
  userId: string,
): Promise<void> {
  const cid = conversationId.trim().toLowerCase();
  const uid = userId.trim().toLowerCase();
  if (!isUuid(cid) || !isUuid(uid)) return;

  await ensureChatTables();

  await executeQuery(
    `
      UPDATE ${PARTICIPANTS_TABLE}
      SET unread_count = 0
      WHERE conversation_id = $1 AND user_id = $2
    `,
    [cid, uid],
  );
}

export async function listChatContactIds(ownerUserId: string): Promise<string[]> {
  const owner = ownerUserId.trim().toLowerCase();
  if (!isUuid(owner)) return [];

  await ensureChatTables();

  const rows = await queryMany<{ contactUserId: string }>(
    `
      SELECT contact_user_id::text AS "contactUserId"
      FROM ${CONTACTS_TABLE}
      WHERE owner_user_id = $1
      ORDER BY created_at DESC
    `,
    [owner],
  );

  return rows.map((row) => row.contactUserId.trim().toLowerCase());
}

export async function addChatContact(
  ownerUserId: string,
  contactUserId: string,
): Promise<boolean> {
  const owner = ownerUserId.trim().toLowerCase();
  const contact = contactUserId.trim().toLowerCase();
  if (!isUuid(owner) || !isUuid(contact) || owner === contact) {
    return false;
  }

  await ensureChatTables();

  await executeQuery(
    `
      INSERT INTO ${CONTACTS_TABLE} (owner_user_id, contact_user_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (owner_user_id, contact_user_id) DO NOTHING
    `,
    [owner, contact],
  );

  return true;
}

export async function removeChatContact(
  ownerUserId: string,
  contactUserId: string,
): Promise<boolean> {
  const owner = ownerUserId.trim().toLowerCase();
  const contact = contactUserId.trim().toLowerCase();
  if (!isUuid(owner) || !isUuid(contact)) {
    return false;
  }

  await ensureChatTables();

  await executeQuery(
    `
      DELETE FROM ${CONTACTS_TABLE}
      WHERE owner_user_id = $1 AND contact_user_id = $2
    `,
    [owner, contact],
  );

  return true;
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const cid = conversationId.trim().toLowerCase();
  if (!isUuid(cid)) {
    return false;
  }

  await ensureChatTables();

  await executeQuery(`DELETE FROM ${CONVERSATIONS_TABLE} WHERE id = $1`, [cid]);

  return true;
}
