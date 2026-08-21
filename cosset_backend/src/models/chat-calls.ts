import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

import {
  appendMessage,
  getConversationById,
  listParticipants,
  userIsConversationParticipant,
} from 'src/models/chat';

const CALLS_TABLE = 'webrtc_calls';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let ensureTablesPromise: Promise<void> | null = null;

export type ChatCallMediaType = 'audio' | 'video';

export type ChatCallStatus =
  | 'ringing'
  | 'active'
  | 'ended'
  | 'rejected'
  | 'missed'
  | 'cancelled';

export type ChatCallRow = {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  mediaType: ChatCallMediaType;
  status: ChatCallStatus;
  createdAt: Date | string;
  answeredAt?: Date | string | null;
  endedAt?: Date | string | null;
};

export type ChatCallHistoryPayload = {
  callId: string;
  mediaType: ChatCallMediaType;
  status: ChatCallStatus;
  durationSec?: number | null;
  endedReason?: string | null;
};

const isUuid = (value: string) => UUID_RE.test(String(value || '').trim());

const ensureCallTables = async (): Promise<void> => {
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${CALLS_TABLE} (
            id UUID PRIMARY KEY,
            conversation_id UUID NOT NULL,
            caller_id UUID NOT NULL,
            callee_id UUID NOT NULL,
            media_type VARCHAR(16) NOT NULL DEFAULT 'audio',
            status VARCHAR(24) NOT NULL DEFAULT 'ringing',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            answered_at TIMESTAMP NULL,
            ended_at TIMESTAMP NULL
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_webrtc_calls_conversation ON ${CALLS_TABLE} (conversation_id, created_at DESC)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_webrtc_calls_participants ON ${CALLS_TABLE} (caller_id, callee_id, status)`,
      );
    })().catch((error) => {
      ensureTablesPromise = null;
      throw error;
    });
  }

  await ensureTablesPromise;
};

const toCallRow = (row: ChatCallRow | null): ChatCallRow | null => {
  if (!row) return null;
  return {
    ...row,
    mediaType: row.mediaType === 'video' ? 'video' : 'audio',
    status: row.status as ChatCallStatus,
  };
};

export async function getChatCallById(callId: string): Promise<ChatCallRow | null> {
  const id = callId.trim().toLowerCase();
  if (!isUuid(id)) return null;

  await ensureCallTables();

  const row = await queryOne<ChatCallRow>(
    `
      SELECT
        id::text AS id,
        conversation_id::text AS "conversationId",
        caller_id::text AS "callerId",
        callee_id::text AS "calleeId",
        media_type AS "mediaType",
        status,
        created_at AS "createdAt",
        answered_at AS "answeredAt",
        ended_at AS "endedAt"
      FROM ${CALLS_TABLE}
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  return toCallRow(row);
}

export async function createChatCall(input: {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  mediaType: ChatCallMediaType;
}): Promise<ChatCallRow> {
  const id = input.id.trim().toLowerCase();
  const conversationId = input.conversationId.trim().toLowerCase();
  const callerId = input.callerId.trim().toLowerCase();
  const calleeId = input.calleeId.trim().toLowerCase();
  const mediaType = input.mediaType === 'video' ? 'video' : 'audio';

  if (!isUuid(id) || !isUuid(conversationId) || !isUuid(callerId) || !isUuid(calleeId)) {
    throw new DatabaseError({
      code: 'CHAT_CALL_INVALID',
      message: 'Invalid call payload',
    });
  }

  if (callerId === calleeId) {
    throw new DatabaseError({
      code: 'CHAT_CALL_INVALID',
      message: 'Cannot call yourself',
    });
  }

  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new DatabaseError({
      code: 'CHAT_CALL_CONVERSATION_NOT_FOUND',
      message: 'Conversation not found',
    });
  }

  if (String(conversation.type || '').toUpperCase() !== 'ONE_TO_ONE') {
    throw new DatabaseError({
      code: 'CHAT_CALL_ONE_TO_ONE_ONLY',
      message: 'Calls are only available for one-to-one conversations',
    });
  }

  const [callerOk, calleeOk] = await Promise.all([
    userIsConversationParticipant(conversationId, callerId),
    userIsConversationParticipant(conversationId, calleeId),
  ]);

  if (!callerOk || !calleeOk) {
    throw new DatabaseError({
      code: 'CHAT_CALL_FORBIDDEN',
      message: 'Caller and callee must be conversation participants',
    });
  }

  const participants = await listParticipants(conversationId);
  if (participants.length !== 2) {
    throw new DatabaseError({
      code: 'CHAT_CALL_ONE_TO_ONE_ONLY',
      message: 'Calls are only available for one-to-one conversations',
    });
  }

  await ensureCallTables();

  const active = await queryOne<{ id: string }>(
    `
      SELECT id::text AS id
      FROM ${CALLS_TABLE}
      WHERE conversation_id = $1
        AND status IN ('ringing', 'active')
        AND (caller_id = $2 OR callee_id = $2 OR caller_id = $3 OR callee_id = $3)
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [conversationId, callerId, calleeId],
  );

  if (active?.id) {
    throw new DatabaseError({
      code: 'CHAT_CALL_BUSY',
      message: 'There is already an active call for this conversation',
    });
  }

  const created = await queryOne<ChatCallRow>(
    `
      INSERT INTO ${CALLS_TABLE} (
        id,
        conversation_id,
        caller_id,
        callee_id,
        media_type,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'ringing', NOW())
      RETURNING
        id::text AS id,
        conversation_id::text AS "conversationId",
        caller_id::text AS "callerId",
        callee_id::text AS "calleeId",
        media_type AS "mediaType",
        status,
        created_at AS "createdAt",
        answered_at AS "answeredAt",
        ended_at AS "endedAt"
    `,
    [id, conversationId, callerId, calleeId, mediaType],
  );

  if (!created) {
    throw new DatabaseError({
      code: 'CHAT_CALL_CREATE_FAILED',
      message: 'Failed to create call',
    });
  }

  return toCallRow(created)!;
}

export async function updateChatCallStatus(
  callId: string,
  status: ChatCallStatus,
  options?: { endedReason?: string | null },
): Promise<ChatCallRow | null> {
  const id = callId.trim().toLowerCase();
  if (!isUuid(id)) return null;

  await ensureCallTables();

  const existing = await getChatCallById(id);
  if (!existing) return null;

  if (['ended', 'rejected', 'missed', 'cancelled'].includes(existing.status)) {
    return existing;
  }

  const answeredAtSql =
    status === 'active' && !existing.answeredAt ? ', answered_at = NOW()' : '';
  const endedAtSql = ['ended', 'rejected', 'missed', 'cancelled'].includes(status)
    ? ', ended_at = NOW()'
    : '';

  const updated = await queryOne<ChatCallRow>(
    `
      UPDATE ${CALLS_TABLE}
      SET status = $2
        ${answeredAtSql}
        ${endedAtSql}
      WHERE id = $1
      RETURNING
        id::text AS id,
        conversation_id::text AS "conversationId",
        caller_id::text AS "callerId",
        callee_id::text AS "calleeId",
        media_type AS "mediaType",
        status,
        created_at AS "createdAt",
        answered_at AS "answeredAt",
        ended_at AS "endedAt"
    `,
    [id, status],
  );

  if (!updated) return null;

  const terminal = ['ended', 'rejected', 'missed', 'cancelled'].includes(status);
  if (terminal) {
    const durationSec = computeCallDurationSeconds(updated);
    await appendCallHistoryMessage({
      conversationId: updated.conversationId,
      senderId: updated.callerId,
      payload: {
        callId: updated.id,
        mediaType: updated.mediaType === 'video' ? 'video' : 'audio',
        status,
        durationSec,
        endedReason: options?.endedReason ?? null,
      },
    });
  }

  return toCallRow(updated);
}

export function computeCallDurationSeconds(call: ChatCallRow): number | null {
  if (!call.answeredAt || !call.endedAt) return null;
  const start = new Date(call.answeredAt).getTime();
  const end = new Date(call.endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.max(0, Math.round((end - start) / 1000));
}

export async function appendCallHistoryMessage(input: {
  conversationId: string;
  senderId: string;
  payload: ChatCallHistoryPayload;
}): Promise<void> {
  const conversationId = input.conversationId.trim().toLowerCase();
  const senderId = input.senderId.trim().toLowerCase();
  if (!isUuid(conversationId) || !isUuid(senderId)) return;

  await appendMessage({
    id: crypto.randomUUID(),
    conversationId,
    senderId,
    body: JSON.stringify(input.payload),
    contentType: 'call',
  });
}

export async function listActiveCallsForUser(userId: string): Promise<ChatCallRow[]> {
  const uid = userId.trim().toLowerCase();
  if (!isUuid(uid)) return [];

  await ensureCallTables();

  const rows = await queryMany<ChatCallRow>(
    `
      SELECT
        id::text AS id,
        conversation_id::text AS "conversationId",
        caller_id::text AS "callerId",
        callee_id::text AS "calleeId",
        media_type AS "mediaType",
        status,
        created_at AS "createdAt",
        answered_at AS "answeredAt",
        ended_at AS "endedAt"
      FROM ${CALLS_TABLE}
      WHERE (caller_id = $1 OR callee_id = $1)
        AND status IN ('ringing', 'active')
      ORDER BY created_at DESC
    `,
    [uid],
  );

  return rows.map((row) => toCallRow(row)!).filter(Boolean);
}

export function userIsCallParticipant(call: ChatCallRow, userId: string): boolean {
  const uid = userId.trim().toLowerCase();
  return call.callerId === uid || call.calleeId === uid;
}

export function getCallPeerId(call: ChatCallRow, userId: string): string {
  const uid = userId.trim().toLowerCase();
  return call.callerId === uid ? call.calleeId : call.callerId;
}
