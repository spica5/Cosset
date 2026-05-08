import type { NextRequest } from 'next/server';

import bcrypt from 'bcryptjs';

import { DatabaseError } from '@/db/errors';

import { createNotification } from 'src/models/notifications';
import { createOrUpdateFriendRelation } from 'src/models/user-friends';
import { createUser, getUserByEmail, getUserById } from 'src/models/users';
import { STATUS, handleError, response } from 'src/utils/response';
import { uuidv4 } from 'src/utils/uuidv4';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toDisplayName = (email: string): string => {
  const localPart = email.split('@')[0] || 'Guest';
  const clean = localPart.replace(/[._-]+/g, ' ').trim();

  return clean
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Guest';
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inviterUserId = String(body?.inviterUserId || '').trim();
    const inviteeEmail = String(body?.inviteeEmail || '').trim().toLowerCase();

    if (!UUID_REGEX.test(inviterUserId)) {
      return response({ message: 'inviterUserId must be a valid UUID' }, STATUS.BAD_REQUEST);
    }

    if (!EMAIL_REGEX.test(inviteeEmail)) {
      return response({ message: 'inviteeEmail must be a valid email address' }, STATUS.BAD_REQUEST);
    }

    const inviter = await getUserById(inviterUserId);

    if (!inviter) {
      return response({ message: 'Inviter user not found' }, STATUS.NOT_FOUND);
    }

    let invitee = await getUserByEmail(inviteeEmail);
    let createdInvitee = false;

    if (!invitee) {
      const tempPassword = await bcrypt.hash(uuidv4(), 10);
      const displayName = toDisplayName(inviteeEmail);

      invitee = await createUser({
        id: uuidv4(),
        email: inviteeEmail,
        password: tempPassword,
        firstName: displayName,
        lastName: undefined,
        photoURL: undefined,
        plan: 'FREE',
        role: 'user',
        phoneNumber: undefined,
        country: undefined,
        address: undefined,
        state: undefined,
        city: undefined,
        zipCode: undefined,
        about: undefined,
        isPublic: false,
      });

      createdInvitee = true;
    }

    const friend = await createOrUpdateFriendRelation(inviterUserId, invitee.id, 'accepted');

    try {
      const inviterName =
        `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email || 'A friend';

      await createNotification({
        customerId: inviterUserId,
        avatarUrl: invitee.photoURL || null,
        type: 1,
        category: 1,
        isUnRead: true,
        isArchived: false,
        title: `<p><strong>${invitee.email}</strong> accepted your invite link</p>`,
        content: `${invitee.email} connected with you from your invite link`,
      });

      await createNotification({
        customerId: invitee.id,
        avatarUrl: inviter.photoURL || null,
        type: 1,
        category: 1,
        isUnRead: true,
        isArchived: false,
        title: `<p>You are now connected with <strong>${inviterName}</strong></p>`,
        content: `You are now connected with ${inviterName}`,
      });
    } catch (notificationError) {
      console.error('[Friend - Invite accept] failed to create notification', notificationError);
    }

    return response(
      {
        friend,
        inviteeUserId: invitee.id,
        inviteeEmail: invitee.email,
        createdInvitee,
      },
      STATUS.OK,
    );
  } catch (error) {
    if (error instanceof DatabaseError && error.code === 'INVALID_FRIEND_REQUEST') {
      return response({ message: error.message }, STATUS.BAD_REQUEST);
    }

    return handleError('Friend - Invite accept', error as Error);
  }
}
