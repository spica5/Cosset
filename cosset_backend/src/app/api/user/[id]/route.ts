import type { NextRequest } from 'next/server';

import {
  updateUser,
  getUserById,
  updateUserRole,
  updateUserPlan,
  updateUserEmail,
  USER_ROLES,
  type UserPlanType,
} from '@/models/users';

import { verify } from 'src/utils/jwt';
import { STATUS, handleError, response } from 'src/utils/response';

import { JWT_SECRET } from 'src/config-global';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const CUSTOMER_STATES = new Set(['active', 'blocked', 'deleted', 'pending', 'inactive']);
const CUSTOMER_PLANS = new Set(['FREE', 'PAID', 'EXTRA-PAID']);

async function requireAdmin(req: NextRequest) {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { error: response({ message: 'Authorization token missing or invalid' }, STATUS.UNAUTHORIZED) };
  }

  const accessToken = `${authorization}`.split(' ')[1];
  const data = await verify(accessToken, JWT_SECRET);

  if (!data.userId) {
    return { error: response({ message: 'Invalid authorization token' }, STATUS.UNAUTHORIZED) };
  }

  const actor = await getUserById(data.userId);

  if (!actor || actor.role !== 'admin') {
    return { error: response({ message: 'Admin access required' }, STATUS.FORBIDDEN) };
  }

  return { actor };
}

function sanitizeUser<T extends { password?: string }>(user: T) {
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return response({ message: 'User ID is required' }, STATUS.BAD_REQUEST);
    }

    const user = await getUserById(id);

    if (!user) {
      return response({ message: 'User not found' }, STATUS.NOT_FOUND);
    }

    const displayName =
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Customer';

    let isAdmin = false;
    try {
      const adminGate = await requireAdmin(req);
      isAdmin = !adminGate.error;
    } catch {
      isAdmin = false;
    }

    if (isAdmin) {
      return response(
        {
          user: {
            ...sanitizeUser(user),
            displayName,
          },
        },
        STATUS.OK,
      );
    }

    // Public/limited profile for non-admin callers (existing behavior).
    return response(
      {
        user: {
          id: user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          displayName,
          photoURL: user.photoURL || '',
          isPublic: user.isPublic,
        },
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('User - details', error as Error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminGate = await requireAdmin(req);
    if (adminGate.error) {
      return adminGate.error;
    }

    const { id } = await params;

    if (!id) {
      return response({ message: 'User ID is required' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const stateRaw = body?.state;
    const roleRaw = body?.role;
    const planRaw = body?.plan;
    const emailRaw = body?.email;

    const hasState = stateRaw !== undefined && stateRaw !== null && String(stateRaw).trim() !== '';
    const hasRole = roleRaw !== undefined && roleRaw !== null && String(roleRaw).trim() !== '';
    const hasPlan = planRaw !== undefined && planRaw !== null && String(planRaw).trim() !== '';
    const hasEmail = emailRaw !== undefined && emailRaw !== null && String(emailRaw).trim() !== '';

    const profileUpdates: {
      firstName?: string | null;
      lastName?: string | null;
      phoneNumber?: string | null;
      country?: string | null;
      address?: string | null;
      city?: string | null;
      zipCode?: string | null;
      about?: string | null;
      isPublic?: boolean;
      state?: string | null;
    } = {};

    if (body?.firstName !== undefined) profileUpdates.firstName = String(body.firstName ?? '').trim() || null;
    if (body?.lastName !== undefined) profileUpdates.lastName = String(body.lastName ?? '').trim() || null;
    if (body?.phoneNumber !== undefined) {
      profileUpdates.phoneNumber = String(body.phoneNumber ?? '').trim() || null;
    }
    if (body?.country !== undefined) profileUpdates.country = String(body.country ?? '').trim() || null;
    if (body?.address !== undefined) profileUpdates.address = String(body.address ?? '').trim() || null;
    if (body?.city !== undefined) profileUpdates.city = String(body.city ?? '').trim() || null;
    if (body?.zipCode !== undefined) profileUpdates.zipCode = String(body.zipCode ?? '').trim() || null;
    if (body?.about !== undefined) profileUpdates.about = String(body.about ?? '').trim() || null;
    if (body?.isPublic !== undefined) profileUpdates.isPublic = Boolean(body.isPublic);

    // Account status is stored in the `state` column (active/blocked/...).
    if (hasState) {
      const state = String(stateRaw).trim().toLowerCase();
      if (!CUSTOMER_STATES.has(state)) {
        return response({ message: 'Invalid customer state' }, STATUS.BAD_REQUEST);
      }
      profileUpdates.state = state;
    }

    const hasProfile = Object.keys(profileUpdates).length > 0;

    if (!hasRole && !hasPlan && !hasEmail && !hasProfile) {
      return response({ message: 'No valid fields to update' }, STATUS.BAD_REQUEST);
    }

    let updatedUser = await getUserById(id);

    if (!updatedUser) {
      return response({ message: 'User not found' }, STATUS.NOT_FOUND);
    }

    if (hasEmail) {
      updatedUser = await updateUserEmail(id, String(emailRaw).trim().toLowerCase());
    }

    if (hasProfile) {
      updatedUser = await updateUser(id, profileUpdates);
    }

    if (hasRole) {
      const role = String(roleRaw).trim().toLowerCase();

      if (!USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
        return response({ message: 'Invalid user role' }, STATUS.BAD_REQUEST);
      }

      updatedUser = await updateUserRole(id, role as (typeof USER_ROLES)[number]);
    }

    if (hasPlan) {
      const plan = String(planRaw).trim().toUpperCase();
      if (!CUSTOMER_PLANS.has(plan)) {
        return response({ message: 'Invalid customer plan' }, STATUS.BAD_REQUEST);
      }
      updatedUser = await updateUserPlan(id, plan as UserPlanType);
    }

    return response({ user: sanitizeUser(updatedUser) }, STATUS.OK);
  } catch (error) {
    return handleError('User - update', error as Error);
  }
}
