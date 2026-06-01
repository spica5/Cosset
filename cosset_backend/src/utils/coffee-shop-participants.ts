import { listCoffeeshopPresence } from 'src/models/coffee-shop-presence';
import { getUserById, getUsersBriefByIds } from 'src/models/users';
import type { UserBrief } from 'src/models/users';

export type CoffeeShopParticipantPayload = {
  userId: string;
  name: string;
  photoURL: string | null;
  joinedAt?: string;
};

const displayNameFromUser = (user: UserBrief | undefined): string => {
  const fromProfile = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fromProfile || user?.email?.split('@')[0] || 'Member';
};

export async function listCoffeeShopParticipants(
  coffeeShopId: number,
): Promise<CoffeeShopParticipantPayload[]> {
  const presenceData = await listCoffeeshopPresence(coffeeShopId);
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
  joinedAt?: string,
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
    ...(joinedAt && { joinedAt }),
  };
}
