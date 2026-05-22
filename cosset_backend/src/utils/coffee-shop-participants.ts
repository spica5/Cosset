import { listCoffeeShopPresenceUserIds } from 'src/models/coffee-shop-presence';
import { getUserById, getUsersBriefByIds } from 'src/models/users';
import type { UserBrief } from 'src/models/users';

export type CoffeeShopParticipantPayload = {
  userId: string;
  name: string;
  photoURL: string | null;
};

const displayNameFromUser = (user: UserBrief | undefined): string => {
  const fromProfile = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fromProfile || user?.email?.split('@')[0] || 'Member';
};

export async function listCoffeeShopParticipants(
  coffeeShopId: number,
): Promise<CoffeeShopParticipantPayload[]> {
  const userIds = await listCoffeeShopPresenceUserIds(coffeeShopId);
  if (!userIds.length) {
    return [];
  }

  const usersBrief = await getUsersBriefByIds(userIds);

  return userIds.map((uid) => {
    const key = uid.trim().toLowerCase();
    const user = usersBrief.get(key);
    const photo = user?.photoURL != null ? String(user.photoURL).trim() : '';

    return {
      userId: user?.id ?? uid,
      name: displayNameFromUser(user),
      photoURL: photo || null,
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

export async function buildCoffeeShopParticipant(
  userId: string,
): Promise<CoffeeShopParticipantPayload | null> {
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
  };
}
