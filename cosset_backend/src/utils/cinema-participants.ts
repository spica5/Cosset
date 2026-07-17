import type { UserBrief } from 'src/models/users';

import { getUserById, getUsersBriefByIds } from 'src/models/users';
import { listCinemaPresence, type CinemaRoomKey } from 'src/models/cinema-presence';

export type CinemaParticipantPayload = {
  userId: string;
  name: string;
  photoURL: string | null;
  joinedAt?: string;
  leftAt?: string | null;
};

const displayNameFromUser = (user: UserBrief | undefined): string => {
  const fromProfile = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fromProfile || user?.email?.split('@')[0] || 'Member';
};

export async function listCinemaParticipants(
  room: CinemaRoomKey,
  includeLeft = false,
): Promise<CinemaParticipantPayload[]> {
  const presenceData = await listCinemaPresence(room, includeLeft);
  if (!presenceData.length) {
    return [];
  }

  const userIds = presenceData.map((p) => p.userId);
  const usersBrief = await getUsersBriefByIds(userIds);

  return presenceData.map((pres) => {
    const key = pres.userId.trim().toLowerCase();
    const user = usersBrief.get(key);
    const photo = user?.photoURL != null ? String(user.photoURL).trim() : '';

    return {
      userId: user?.id ?? pres.userId,
      name: displayNameFromUser(user),
      photoURL: photo || null,
      joinedAt: pres.joinedAt,
      leftAt: pres.leftAt,
    };
  });
}

const toUserBrief = (user: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}): UserBrief => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  photoURL: user.photoURL,
});

export async function buildCinemaParticipant(
  userId: string,
  joinedAt?: string,
): Promise<CinemaParticipantPayload | null> {
  const key = userId.trim().toLowerCase();
  const usersBrief = await getUsersBriefByIds([userId]);
  let user = usersBrief.get(key);

  if (!user) {
    const full = await getUserById(userId);
    if (!full) {
      return null;
    }
    user = toUserBrief(full);
  }

  const photo = user.photoURL != null ? String(user.photoURL).trim() : '';

  return {
    userId: user.id,
    name: displayNameFromUser(user),
    photoURL: photo || null,
    ...(joinedAt && { joinedAt }),
  };
}
