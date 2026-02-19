import type { NextRequest } from 'next/server';

import bcrypt from 'bcryptjs';
import { uuidv4 } from '@/utils/uuidv4';
import { createUser, userExistsByEmail } from '@/models/users';

import { sign } from 'src/utils/jwt';
import { STATUS, response } from 'src/utils/response';

import { JWT_SECRET, JWT_EXPIRES_IN } from 'src/config-global';

// ----------------------------------------------------------------------

// export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await req.json();

    // Check if user already exists in database
    const existUser = await userExistsByEmail(email);

    if (existUser) {
      return response(
        'There already exists an account with the given email address.',
        STATUS.CONFLICT
      );
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      photoURL: undefined,
      plan: 'FREE' as const,
      role: 'user' as const,
      phoneNumber: undefined,
      country: undefined,
      address: undefined,
      state: undefined,
      city: undefined,
      zipCode: undefined,
      about: undefined,
      isPublic: false,
    };

    // Create user in database
    const createdUser = await createUser(newUser);

    const accessToken = await sign({ userId: createdUser.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return response({ user: createdUser, accessToken }, STATUS.OK);
  } catch (error) {
    console.error('[Auth - sign up]: ', error);
    return response('Internal server error', STATUS.ERROR);
  }
}
