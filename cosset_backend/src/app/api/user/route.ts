import type { NextRequest } from 'next/server';

import bcrypt from 'bcryptjs';
import { uuidv4 } from '@/utils/uuidv4';
import {
  createUser,
  getUserById,
  getUserByEmail,
  USER_ROLES,
  type UserPlanType,
  type UserRoleType,
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

/** POST /api/user — Admin create customer */
export async function POST(req: NextRequest) {
  try {
    const adminGate = await requireAdmin(req);
    if (adminGate.error) {
      return adminGate.error;
    }

    const body = await req.json();
    const normalizedEmail = String(body.email || '')
      .trim()
      .toLowerCase();
    const rawPassword = String(body.password || '');

    if (!normalizedEmail) {
      return response({ message: 'Email is required' }, STATUS.BAD_REQUEST);
    }

    if (rawPassword.length < 6) {
      return response({ message: 'Password must be at least 6 characters' }, STATUS.BAD_REQUEST);
    }

    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      return response(
        { message: 'There already exists an account with the given email address.' },
        STATUS.CONFLICT
      );
    }

    const requestedRole = String(body.role || 'user')
      .trim()
      .toLowerCase() as UserRoleType;
    if (!USER_ROLES.includes(requestedRole)) {
      return response({ message: 'Invalid role' }, STATUS.BAD_REQUEST);
    }

    const requestedPlan = String(body.plan || 'FREE')
      .trim()
      .toUpperCase() as UserPlanType;
    if (!CUSTOMER_PLANS.has(requestedPlan)) {
      return response({ message: 'Invalid plan' }, STATUS.BAD_REQUEST);
    }

    const requestedState = String(body.state || 'active')
      .trim()
      .toLowerCase();
    if (!CUSTOMER_STATES.has(requestedState)) {
      return response({ message: 'Invalid account state' }, STATUS.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const created = await createUser({
      id: uuidv4(),
      email: normalizedEmail,
      password: hashedPassword,
      firstName: body.firstName ? String(body.firstName).trim() : undefined,
      lastName: body.lastName ? String(body.lastName).trim() : undefined,
      phoneNumber: body.phoneNumber ? String(body.phoneNumber).trim() : undefined,
      photoURL: undefined,
      plan: requestedPlan,
      role: requestedRole,
      country: body.country ? String(body.country).trim() : undefined,
      address: body.address ? String(body.address).trim() : undefined,
      city: body.city ? String(body.city).trim() : undefined,
      zipCode: body.zipCode ? String(body.zipCode).trim() : undefined,
      about: body.about ? String(body.about).trim() : undefined,
      state: requestedState,
      isPublic: Boolean(body.isPublic),
    });

    return response({ user: sanitizeUser(created) }, STATUS.OK);
  } catch (error) {
    return handleError('User - create', error as Error);
  }
}
