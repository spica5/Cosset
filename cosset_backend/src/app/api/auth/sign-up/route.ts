import type { NextRequest } from 'next/server';

import bcrypt from 'bcryptjs';
import { uuidv4 } from '@/utils/uuidv4';
import { createEmailVerificationCode } from '@/models/email-verification-codes';
import {
  createUser,
  updateUser,
  getUserByEmail,
  updateUserPassword,
} from '@/models/users';

import { STATUS, response } from 'src/utils/response';
import { sendEmailVerificationEmail } from 'src/utils/email';

// ----------------------------------------------------------------------

function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getAccountState(user: { state?: string | null }) {
  return String(user.state || 'active').trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, role, accountType } = await req.json();
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();
    const rawPassword = String(password || '');

    if (!normalizedEmail) {
      return response({ message: 'Email is required.' }, STATUS.BAD_REQUEST);
    }

    if (rawPassword.length < 6) {
      return response({ message: 'Password must be at least 6 characters.' }, STATUS.BAD_REQUEST);
    }

    const existingUser = await getUserByEmail(normalizedEmail);
    const requestedRole = String(role || accountType || 'user')
      .trim()
      .toLowerCase();
    const signupRole =
      requestedRole === 'business' ? ('business' as const) : ('user' as const);

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    if (existingUser) {
      const accountState = getAccountState(existingUser);

      if (accountState !== 'pending') {
        return response(
          { message: 'There already exists an account with the given email address.' },
          STATUS.CONFLICT,
        );
      }

      // Pending account: update credentials and resend verification code.
      await updateUserPassword(existingUser.id, hashedPassword);
      await updateUser(existingUser.id, {
        firstName: firstName || existingUser.firstName || null,
        lastName: lastName || existingUser.lastName || null,
        state: 'pending',
      });
    } else {
      await createUser({
        id: uuidv4(),
        email: normalizedEmail,
        password: hashedPassword,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        photoURL: undefined,
        plan: 'FREE',
        role: signupRole,
        phoneNumber: undefined,
        country: undefined,
        address: undefined,
        state: 'pending',
        city: undefined,
        zipCode: undefined,
        about: undefined,
        isPublic: false,
      });
    }

    const code = generateVerificationCode();
    await createEmailVerificationCode(normalizedEmail, code);

    const emailResult = await sendEmailVerificationEmail(normalizedEmail, code);
    const devCode = emailResult.devMode ? code : undefined;

    return response(
      {
        requiresVerification: true,
        email: normalizedEmail,
        message: devCode
          ? 'Could not send email (SMTP unreachable). Use the verification code shown below.'
          : 'We sent a verification code to your email. Enter it to finish creating your account.',
        ...(devCode ? { devCode } : {}),
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - sign up]: ', error);
    const message =
      error instanceof Error ? error.message : 'Unable to create account.';
    return response({ message }, STATUS.ERROR);
  }
}
