import type { NextRequest } from 'next/server';

import bcrypt from 'bcryptjs';
import { uuidv4 } from '@/utils/uuidv4';
import { OAuth2Client } from 'google-auth-library';
import { createUser, getUserByEmail, updateUser } from '@/models/users';

import { sign } from 'src/utils/jwt';
import { STATUS, response } from 'src/utils/response';

import { GOOGLE_CLIENT_ID, JWT_SECRET, JWT_EXPIRES_IN } from 'src/config-global';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const INACTIVE_CUSTOMER_MESSAGE =
  "Your account isn't active and can't log in. Please contact support.";

type GoogleProfile = {
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  picture?: string;
};

function getCustomerState(user: { state?: string | null }) {
  return String(user.state || 'active').trim().toLowerCase();
}

function sanitizeUser<T extends { password?: string }>(user: T) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

async function profileFromIdToken(idToken: string): Promise<GoogleProfile> {
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  return {
    email: String(payload?.email || '')
      .trim()
      .toLowerCase(),
    emailVerified: Boolean(payload?.email_verified),
    givenName: payload?.given_name || undefined,
    familyName: payload?.family_name || undefined,
    picture: payload?.picture || undefined,
  };
}

async function profileFromAccessToken(accessToken: string): Promise<GoogleProfile> {
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userInfoRes.ok) {
    throw new Error(`Google userinfo request failed with status ${userInfoRes.status}`);
  }

  const payload = (await userInfoRes.json()) as {
    email?: string;
    email_verified?: boolean | string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };

  return {
    email: String(payload.email || '')
      .trim()
      .toLowerCase(),
    emailVerified:
      payload.email_verified === true ||
      payload.email_verified === 'true',
    givenName: payload.given_name || undefined,
    familyName: payload.family_name || undefined,
    picture: payload.picture || undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return response({ message: 'Google sign-in is not configured on the server.' }, STATUS.ERROR);
    }

    const body = await req.json();
    const idToken = String(body?.idToken || body?.credential || '').trim();
    const googleAccessToken = String(body?.accessToken || '').trim();

    if (!idToken && !googleAccessToken) {
      return response(
        { message: 'Google ID token or access token is required.' },
        STATUS.BAD_REQUEST,
      );
    }

    const profile = idToken
      ? await profileFromIdToken(idToken)
      : await profileFromAccessToken(googleAccessToken);

    if (!profile.email) {
      return response({ message: 'Google account email is required.' }, STATUS.BAD_REQUEST);
    }

    if (!profile.emailVerified) {
      return response({ message: 'Google email address is not verified.' }, STATUS.UNAUTHORIZED);
    }

    let user = await getUserByEmail(profile.email);

    if (!user) {
      const hashedPassword = await bcrypt.hash(`${uuidv4()}${uuidv4()}`, 10);

      user = await createUser({
        id: uuidv4(),
        email: profile.email,
        password: hashedPassword,
        firstName: profile.givenName,
        lastName: profile.familyName,
        photoURL: profile.picture,
        plan: 'FREE',
        role: 'user',
        phoneNumber: undefined,
        country: undefined,
        address: undefined,
        state: 'active',
        city: undefined,
        zipCode: undefined,
        about: undefined,
        isPublic: false,
      });
    } else {
      const accountState = getCustomerState(user);

      if (accountState === 'pending') {
        const profileUpdates: Parameters<typeof updateUser>[1] = { state: 'active' };

        if (!user.photoURL && profile.picture) {
          profileUpdates.photoURL = profile.picture;
        }
        if (!user.firstName && profile.givenName) {
          profileUpdates.firstName = profile.givenName;
        }
        if (!user.lastName && profile.familyName) {
          profileUpdates.lastName = profile.familyName;
        }

        user = await updateUser(user.id, profileUpdates);
      } else if (accountState !== 'active') {
        return response({ message: INACTIVE_CUSTOMER_MESSAGE }, STATUS.UNAUTHORIZED);
      } else {
        const profileUpdates: Parameters<typeof updateUser>[1] = {};

        if (!user.photoURL && profile.picture) {
          profileUpdates.photoURL = profile.picture;
        }
        if (!user.firstName && profile.givenName) {
          profileUpdates.firstName = profile.givenName;
        }
        if (!user.lastName && profile.familyName) {
          profileUpdates.lastName = profile.familyName;
        }

        if (Object.keys(profileUpdates).length > 0) {
          user = await updateUser(user.id, profileUpdates);
        }
      }
    }

    const accessToken = await sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return response({ user: sanitizeUser(user), accessToken }, STATUS.OK);
  } catch (error) {
    console.error('[Auth - Google sign in]: ', error);
    return response({ message: 'Unable to sign in with Google. Please try again.' }, STATUS.ERROR);
  }
}
